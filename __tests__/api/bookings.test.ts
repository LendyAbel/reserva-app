import {
    mockPrisma,
    mockPrismaNamespace,
    resetMockPrisma,
} from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/generated/prisma/client', () => ({
    Prisma: mockPrismaNamespace,
}));

import { GET, POST } from '@/app/api/bookings/route';

const baseBody = {
    stylistId: 'stylist-1',
    serviceId: 'service-1',
    startAt: '2026-01-10T10:00:00.000Z',
    clientName: 'Juan Perez',
    clientEmail: 'juan@example.com',
    clientPhone: '555-1234',
};

const postRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
    });

describe('POST /api/bookings', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 400 si faltan campos obligatorios', async () => {
        const response = await POST(postRequest({ stylistId: 'stylist-1' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/Faltan campos obligatorios/);
    });

    it('devuelve 400 si el estilista no ofrece el servicio', async () => {
        mockPrisma.stylistService.findUnique.mockResolvedValue(null);

        const response = await POST(postRequest(baseBody));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/no ofrece el servicio/);
    });

    it('devuelve 404 si el servicio no existe', async () => {
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: baseBody.stylistId,
            serviceId: baseBody.serviceId,
        });
        mockPrisma.service.findUnique.mockResolvedValue(null);

        const response = await POST(postRequest(baseBody));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Servicio no encontrado.');
    });

    it('crea la reserva correctamente', async () => {
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: baseBody.stylistId,
            serviceId: baseBody.serviceId,
        });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: baseBody.serviceId,
            durationMinutes: 30,
        });
        mockPrisma.client.upsert.mockResolvedValue({ id: 'client-1' });
        mockPrisma.booking.create.mockResolvedValue({
            id: 'booking-1',
            status: 'PENDING',
        });

        const response = await POST(postRequest(baseBody));
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toEqual({ id: 'booking-1', status: 'PENDING' });
        expect(mockPrisma.client.upsert).toHaveBeenCalledWith({
            where: { email: baseBody.clientEmail },
            update: { name: baseBody.clientName, phone: baseBody.clientPhone },
            create: {
                name: baseBody.clientName,
                email: baseBody.clientEmail,
                phone: baseBody.clientPhone,
            },
        });
        expect(mockPrisma.booking.create).toHaveBeenCalledWith({
            data: {
                stylistId: baseBody.stylistId,
                serviceId: baseBody.serviceId,
                clientId: 'client-1',
                startAt: new Date(baseBody.startAt),
                endAt: new Date(
                    new Date(baseBody.startAt).getTime() + 30 * 60_000,
                ),
                status: 'PENDING',
            },
        });
    });

    it('devuelve 409 si el horario ya no está disponible', async () => {
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: baseBody.stylistId,
            serviceId: baseBody.serviceId,
        });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: baseBody.serviceId,
            durationMinutes: 30,
        });
        mockPrisma.client.upsert.mockResolvedValue({ id: 'client-1' });

        const conflictError = new mockPrismaNamespace.PrismaClientKnownRequestError(
            'conflict',
            {
                code: 'P2010',
                meta: { driverAdapterError: { cause: { code: '23P01' } } },
            },
        );
        mockPrisma.booking.create.mockRejectedValue(conflictError);

        const response = await POST(postRequest(baseBody));
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toMatch(/ya no está disponible/);
    });

    it('devuelve 500 ante un error inesperado al crear la reserva', async () => {
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: baseBody.stylistId,
            serviceId: baseBody.serviceId,
        });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: baseBody.serviceId,
            durationMinutes: 30,
        });
        mockPrisma.client.upsert.mockResolvedValue({ id: 'client-1' });
        mockPrisma.booking.create.mockRejectedValue(new Error('boom'));

        const response = await POST(postRequest(baseBody));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toMatch(/No se pudo crear la reserva/);
    });
});

describe('GET /api/bookings', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 400 si el status no es válido', async () => {
        const request = new Request(
            'http://localhost/api/bookings?status=INVALID',
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/status inválido/);
    });

    it('devuelve reservas paginadas con los filtros aplicados', async () => {
        mockPrisma.booking.findMany.mockResolvedValue([
            { id: 'booking-1' },
        ]);
        mockPrisma.booking.count.mockResolvedValue(1);

        const request = new Request(
            'http://localhost/api/bookings?stylistId=stylist-1&status=CONFIRMED&page=2&pageSize=5',
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.bookings).toEqual([{ id: 'booking-1' }]);
        expect(data.pagination).toEqual({
            page: 2,
            pageSize: 5,
            totalCount: 1,
            totalPages: 1,
        });
        expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { stylistId: 'stylist-1', status: 'CONFIRMED' },
                skip: 5,
                take: 5,
            }),
        );
    });

    it('limita pageSize al máximo permitido', async () => {
        mockPrisma.booking.findMany.mockResolvedValue([]);
        mockPrisma.booking.count.mockResolvedValue(0);

        const request = new Request(
            'http://localhost/api/bookings?pageSize=1000',
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pagination.pageSize).toBe(100);
    });
});

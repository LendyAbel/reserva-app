import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '@/app/api/availability/route';

const getRequest = (query: string) =>
    new Request(`http://localhost/api/availability?${query}`);

const baseQuery =
    'stylistId=stylist-1&serviceId=service-1&date=2026-01-12';

describe('GET /api/availability', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 400 si faltan parámetros obligatorios', async () => {
        const response = await GET(getRequest('stylistId=stylist-1'));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/Faltan parámetros obligatorios/);
    });

    it('devuelve 500 si no hay negocio configurado', async () => {
        mockPrisma.business.findFirst.mockResolvedValue(null);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('No hay ningún negocio configurado.');
    });

    it('devuelve 404 si el servicio no existe', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue(null);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Servicio no encontrado.');
    });

    it('devuelve 400 si el estilista no ofrece el servicio', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue(null);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/no ofrece el servicio/);
    });

    it('devuelve 400 si la fecha es inválida', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });

        const response = await GET(
            getRequest('stylistId=stylist-1&serviceId=service-1&date=no-es-una-fecha'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Fecha inválida.');
    });

    it('devuelve slots vacíos si el día está marcado como libre', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            isDayOff: true,
        });

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ slots: [] });
    });

    it('devuelve slots vacíos si no hay horario definido ese día', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });
        mockPrisma.availabilityException.findUnique.mockResolvedValue(null);
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([]);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ slots: [] });
    });

    it('usa el tramo de la excepción del día cuando existe en vez del horario semanal', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            isDayOff: false,
            startTime: '12:00',
            endTime: '13:00',
        });
        mockPrisma.booking.findMany.mockResolvedValue([]);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.slots).toEqual([
            {
                startAt: '2026-01-12T12:00:00.000Z',
                endAt: '2026-01-12T13:00:00.000Z',
            },
        ]);
        expect(mockPrisma.weeklyAvailability.findMany).not.toHaveBeenCalled();
    });

    it('genera los slots disponibles descartando los que se solapan con reservas existentes', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });
        mockPrisma.availabilityException.findUnique.mockResolvedValue(null);
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([
            { startTime: '09:00', endTime: '11:00' },
        ]);
        mockPrisma.booking.findMany.mockResolvedValue([
            {
                startAt: new Date('2026-01-12T09:00:00.000Z'),
                endAt: new Date('2026-01-12T09:45:00.000Z'),
            },
        ]);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.slots).toEqual([
            {
                startAt: '2026-01-12T09:45:00.000Z',
                endAt: '2026-01-12T10:45:00.000Z',
            },
            {
                startAt: '2026-01-12T10:00:00.000Z',
                endAt: '2026-01-12T11:00:00.000Z',
            },
        ]);
    });

    it('combina varios tramos del mismo día (turno partido)', async () => {
        mockPrisma.business.findFirst.mockResolvedValue({ timezone: 'UTC' });
        mockPrisma.service.findUnique.mockResolvedValue({
            id: 'service-1',
            durationMinutes: 60,
        });
        mockPrisma.stylistService.findUnique.mockResolvedValue({
            stylistId: 'stylist-1',
            serviceId: 'service-1',
        });
        mockPrisma.availabilityException.findUnique.mockResolvedValue(null);
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([
            { startTime: '09:00', endTime: '10:00' },
            { startTime: '14:00', endTime: '15:00' },
        ]);
        mockPrisma.booking.findMany.mockResolvedValue([]);

        const response = await GET(getRequest(baseQuery));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.slots).toEqual([
            {
                startAt: '2026-01-12T09:00:00.000Z',
                endAt: '2026-01-12T10:00:00.000Z',
            },
            {
                startAt: '2026-01-12T14:00:00.000Z',
                endAt: '2026-01-12T15:00:00.000Z',
            },
        ]);
        expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    startAt: { lt: new Date('2026-01-12T15:00:00.000Z') },
                    endAt: { gt: new Date('2026-01-12T09:00:00.000Z') },
                }),
            }),
        );
    });
});

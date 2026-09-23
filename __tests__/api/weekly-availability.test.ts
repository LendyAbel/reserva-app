import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET, POST } from '@/app/api/stylists/[stylistId]/weekly-availability/route';

const context = (stylistId: string) => ({ params: Promise.resolve({ stylistId }) });

const postRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/stylists/stylist-1/weekly-availability', {
        method: 'POST',
        body: JSON.stringify(body),
    });

describe('GET /api/stylists/[stylistId]/weekly-availability', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el estilista no existe', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue(null);

        const response = await GET(
            new Request('http://localhost/api/stylists/missing/weekly-availability'),
            context('missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Estilista no encontrado.');
    });

    it('devuelve los horarios semanales del estilista', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([
            { id: 'wa-1', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '13:00' },
        ]);

        const response = await GET(
            new Request('http://localhost/api/stylists/stylist-1/weekly-availability'),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.weeklyAvailability).toEqual([
            { id: 'wa-1', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '13:00' },
        ]);
        expect(mockPrisma.weeklyAvailability.findMany).toHaveBeenCalledWith({
            where: { stylistId: 'stylist-1' },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
    });
});

describe('POST /api/stylists/[stylistId]/weekly-availability', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el estilista no existe', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue(null);

        const response = await POST(
            postRequest({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' }),
            context('missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Estilista no encontrado.');
    });

    it('devuelve 400 si dayOfWeek es inválido', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({ dayOfWeek: 'FUNDAY', startTime: '09:00', endTime: '10:00' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/dayOfWeek inválido/);
    });

    it('devuelve 400 si startTime/endTime tienen formato inválido', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({ dayOfWeek: 'MONDAY', startTime: '9:00', endTime: '10:00' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/formato HH:mm/);
    });

    it('devuelve 400 si startTime no es anterior a endTime', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({ dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '09:00' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('startTime debe ser anterior a endTime.');
    });

    it('devuelve 409 si el tramo se solapa con uno existente', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([
            { id: 'wa-1', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' },
        ]);

        const response = await POST(
            postRequest({ dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '12:00' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toMatch(/se solapa/);
    });

    it('crea el horario cuando no hay solapamientos', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([]);
        mockPrisma.weeklyAvailability.create.mockResolvedValue({
            id: 'wa-new',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });

        const response = await POST(
            postRequest({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toEqual({
            id: 'wa-new',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });
        expect(mockPrisma.weeklyAvailability.create).toHaveBeenCalledWith({
            data: {
                stylistId: 'stylist-1',
                dayOfWeek: 'MONDAY',
                startTime: '09:00',
                endTime: '10:00',
            },
        });
    });
});

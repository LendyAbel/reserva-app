import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { PATCH, DELETE } from '@/app/api/stylists/[stylistId]/weekly-availability/[id]/route';

const context = (stylistId: string, id: string) => ({
    params: Promise.resolve({ stylistId, id }),
});

const patchRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/stylists/stylist-1/weekly-availability/wa-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

describe('PATCH /api/stylists/[stylistId]/weekly-availability/[id]', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el horario no existe', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue(null);

        const response = await PATCH(
            patchRequest({ startTime: '09:00' }),
            context('stylist-1', 'missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Horario no encontrado.');
    });

    it('devuelve 404 si el horario pertenece a otro estilista', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'otro-estilista',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });

        const response = await PATCH(
            patchRequest({ startTime: '09:30' }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Horario no encontrado.');
    });

    it('devuelve 400 si el formato de hora es inválido', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });

        const response = await PATCH(
            patchRequest({ startTime: '9:00' }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/formato HH:mm/);
    });

    it('devuelve 400 si startTime no es anterior a endTime', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });

        const response = await PATCH(
            patchRequest({ startTime: '11:00' }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('startTime debe ser anterior a endTime.');
    });

    it('devuelve 409 si el nuevo tramo se solapa con otro horario', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([
            { id: 'wa-2', dayOfWeek: 'MONDAY', startTime: '11:00', endTime: '12:00' },
        ]);

        const response = await PATCH(
            patchRequest({ endTime: '11:30' }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toMatch(/se solapa/);
        expect(mockPrisma.weeklyAvailability.findMany).toHaveBeenCalledWith({
            where: { stylistId: 'stylist-1', dayOfWeek: 'MONDAY', id: { not: 'wa-1' } },
        });
    });

    it('actualiza el horario cuando los datos son válidos, conservando los campos no enviados', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
        });
        mockPrisma.weeklyAvailability.findMany.mockResolvedValue([]);
        mockPrisma.weeklyAvailability.update.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '11:00',
        });

        const response = await PATCH(
            patchRequest({ endTime: '11:00' }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.endTime).toBe('11:00');
        expect(mockPrisma.weeklyAvailability.update).toHaveBeenCalledWith({
            where: { id: 'wa-1' },
            data: {
                dayOfWeek: 'MONDAY',
                startTime: '09:00',
                endTime: '11:00',
            },
        });
    });
});

describe('DELETE /api/stylists/[stylistId]/weekly-availability/[id]', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el horario no existe', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue(null);

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/weekly-availability/missing', {
                method: 'DELETE',
            }),
            context('stylist-1', 'missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Horario no encontrado.');
    });

    it('devuelve 404 si el horario pertenece a otro estilista', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'otro-estilista',
        });

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/weekly-availability/wa-1', {
                method: 'DELETE',
            }),
            context('stylist-1', 'wa-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Horario no encontrado.');
    });

    it('elimina el horario y devuelve 204', async () => {
        mockPrisma.weeklyAvailability.findUnique.mockResolvedValue({
            id: 'wa-1',
            stylistId: 'stylist-1',
        });

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/weekly-availability/wa-1', {
                method: 'DELETE',
            }),
            context('stylist-1', 'wa-1'),
        );

        expect(response.status).toBe(204);
        expect(mockPrisma.weeklyAvailability.delete).toHaveBeenCalledWith({
            where: { id: 'wa-1' },
        });
    });
});

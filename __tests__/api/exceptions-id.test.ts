import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { PATCH, DELETE } from '@/app/api/stylists/[stylistId]/exceptions/[id]/route';

const context = (stylistId: string, id: string) => ({
    params: Promise.resolve({ stylistId, id }),
});

const patchRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/stylists/stylist-1/exceptions/exc-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

describe('PATCH /api/stylists/[stylistId]/exceptions/[id]', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si la excepción no existe', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue(null);

        const response = await PATCH(
            patchRequest({ reason: 'Vacaciones' }),
            context('stylist-1', 'missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Excepción no encontrada.');
    });

    it('devuelve 404 si la excepción pertenece a otro estilista', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'otro-estilista',
            isDayOff: true,
            startTime: null,
            endTime: null,
            reason: null,
        });

        const response = await PATCH(
            patchRequest({ reason: 'Vacaciones' }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Excepción no encontrada.');
    });

    it('devuelve 400 si isDayOff es false y faltan horas válidas', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: true,
            startTime: null,
            endTime: null,
            reason: null,
        });

        const response = await PATCH(
            patchRequest({ isDayOff: false }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/startTime y endTime son obligatorios/);
    });

    it('devuelve 400 si startTime no es anterior a endTime', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: false,
            startTime: '09:00',
            endTime: '10:00',
            reason: null,
        });

        const response = await PATCH(
            patchRequest({ startTime: '11:00' }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('startTime debe ser anterior a endTime.');
    });

    it('actualiza la excepción cuando los datos son válidos, conservando los campos no enviados', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: false,
            startTime: '09:00',
            endTime: '10:00',
            reason: null,
        });
        mockPrisma.availabilityException.update.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: false,
            startTime: '09:00',
            endTime: '11:00',
            reason: null,
        });

        const response = await PATCH(
            patchRequest({ endTime: '11:00' }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.endTime).toBe('11:00');
        expect(mockPrisma.availabilityException.update).toHaveBeenCalledWith({
            where: { id: 'exc-1' },
            data: {
                isDayOff: false,
                startTime: '09:00',
                endTime: '11:00',
                reason: null,
            },
        });
    });

    it('limpia startTime/endTime cuando isDayOff pasa a true', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: false,
            startTime: '09:00',
            endTime: '10:00',
            reason: null,
        });
        mockPrisma.availabilityException.update.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            isDayOff: true,
            startTime: null,
            endTime: null,
            reason: null,
        });

        const response = await PATCH(
            patchRequest({ isDayOff: true }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockPrisma.availabilityException.update).toHaveBeenCalledWith({
            where: { id: 'exc-1' },
            data: {
                isDayOff: true,
                startTime: null,
                endTime: null,
                reason: null,
            },
        });
        expect(data.isDayOff).toBe(true);
    });
});

describe('DELETE /api/stylists/[stylistId]/exceptions/[id]', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si la excepción no existe', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue(null);

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/exceptions/missing', {
                method: 'DELETE',
            }),
            context('stylist-1', 'missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Excepción no encontrada.');
    });

    it('devuelve 404 si la excepción pertenece a otro estilista', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'otro-estilista',
        });

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/exceptions/exc-1', {
                method: 'DELETE',
            }),
            context('stylist-1', 'exc-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Excepción no encontrada.');
    });

    it('elimina la excepción y devuelve 204', async () => {
        mockPrisma.availabilityException.findUnique.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
        });

        const response = await DELETE(
            new Request('http://localhost/api/stylists/stylist-1/exceptions/exc-1', {
                method: 'DELETE',
            }),
            context('stylist-1', 'exc-1'),
        );

        expect(response.status).toBe(204);
        expect(mockPrisma.availabilityException.delete).toHaveBeenCalledWith({
            where: { id: 'exc-1' },
        });
    });
});

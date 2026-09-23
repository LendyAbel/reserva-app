import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { PATCH } from '@/app/api/bookings/[id]/route';

const patchRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/bookings/booking-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe('PATCH /api/bookings/[id]', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 400 si el status es inválido', async () => {
        const response = await PATCH(
            patchRequest({ status: 'BOGUS' }),
            context('booking-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/status inválido/);
    });

    it('devuelve 404 si la reserva no existe', async () => {
        mockPrisma.booking.findUnique.mockResolvedValue(null);

        const response = await PATCH(
            patchRequest({ status: 'CONFIRMED' }),
            context('missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Reserva no encontrada.');
    });

    it('devuelve 409 si la transición de estado no está permitida', async () => {
        mockPrisma.booking.findUnique.mockResolvedValue({
            id: 'booking-1',
            status: 'CANCELLED',
        });

        const response = await PATCH(
            patchRequest({ status: 'CONFIRMED' }),
            context('booking-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe('No se puede cambiar de CANCELLED a CONFIRMED.');
    });

    it('actualiza la reserva cuando la transición es válida', async () => {
        mockPrisma.booking.findUnique.mockResolvedValue({
            id: 'booking-1',
            status: 'PENDING',
        });
        mockPrisma.booking.update.mockResolvedValue({
            id: 'booking-1',
            status: 'CONFIRMED',
        });

        const response = await PATCH(
            patchRequest({ status: 'CONFIRMED' }),
            context('booking-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ id: 'booking-1', status: 'CONFIRMED' });
        expect(mockPrisma.booking.update).toHaveBeenCalledWith({
            where: { id: 'booking-1' },
            data: { status: 'CONFIRMED' },
        });
    });
});

import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '@/app/api/stylists/route';

describe('GET /api/stylists', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve estilistas activos con sus servicios aplanados', async () => {
        mockPrisma.stylist.findMany.mockResolvedValue([
            {
                id: 's1',
                name: 'Ana',
                email: 'ana@example.com',
                phone: '123',
                services: [
                    { service: { id: 'sv1', name: 'Corte', durationMinutes: 30 } },
                    { service: { id: 'sv2', name: 'Tinte', durationMinutes: 90 } },
                ],
            },
        ]);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual([
            {
                id: 's1',
                name: 'Ana',
                email: 'ana@example.com',
                phone: '123',
                services: [
                    { id: 'sv1', name: 'Corte', durationMinutes: 30 },
                    { id: 'sv2', name: 'Tinte', durationMinutes: 90 },
                ],
            },
        ]);
    });

    it('devuelve 500 si falla la consulta a la base de datos', async () => {
        mockPrisma.stylist.findMany.mockRejectedValue(new Error('db down'));

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'No se pudieron cargar los estilistas.' });
    });
});

import { mockPrisma, resetMockPrisma } from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '@/app/api/services/route';

describe('GET /api/services', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve la lista de servicios activos ordenados por nombre', async () => {
        const services = [
            { id: '1', name: 'Corte', durationMinutes: 30, active: true },
            { id: '2', name: 'Tinte', durationMinutes: 90, active: true },
        ];
        mockPrisma.service.findMany.mockResolvedValue(services);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(services);
        expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
    });

    it('devuelve 500 si falla la consulta a la base de datos', async () => {
        mockPrisma.service.findMany.mockRejectedValue(new Error('db down'));

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'No se pudieron cargar los servicios' });
    });
});

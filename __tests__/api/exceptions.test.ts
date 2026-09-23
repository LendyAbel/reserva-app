import {
    mockPrisma,
    mockPrismaNamespace,
    resetMockPrisma,
} from '../helpers/mockPrisma';

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/generated/prisma/client', () => ({
    Prisma: mockPrismaNamespace,
}));

import { GET, POST } from '@/app/api/stylists/[stylistId]/exceptions/route';

const context = (stylistId: string) => ({ params: Promise.resolve({ stylistId }) });

const postRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost/api/stylists/stylist-1/exceptions', {
        method: 'POST',
        body: JSON.stringify(body),
    });

describe('GET /api/stylists/[stylistId]/exceptions', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el estilista no existe', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue(null);

        const response = await GET(
            new Request('http://localhost/api/stylists/missing/exceptions'),
            context('missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Estilista no encontrado.');
    });

    it('devuelve las excepciones del estilista ordenadas por fecha', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.availabilityException.findMany.mockResolvedValue([
            { id: 'exc-1', date: '2026-01-12', isDayOff: true },
        ]);

        const response = await GET(
            new Request('http://localhost/api/stylists/stylist-1/exceptions'),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.exceptions).toEqual([
            { id: 'exc-1', date: '2026-01-12', isDayOff: true },
        ]);
        expect(mockPrisma.availabilityException.findMany).toHaveBeenCalledWith({
            where: { stylistId: 'stylist-1' },
            orderBy: { date: 'asc' },
        });
    });
});

describe('POST /api/stylists/[stylistId]/exceptions', () => {
    beforeEach(() => {
        resetMockPrisma();
    });

    it('devuelve 404 si el estilista no existe', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue(null);

        const response = await POST(
            postRequest({ date: '2026-01-12' }),
            context('missing'),
        );
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Estilista no encontrado.');
    });

    it('devuelve 400 si falta la fecha o es inválida', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({ date: 'fecha-invalida' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/fecha válida/);
    });

    it('devuelve 400 si no es día libre pero faltan horas válidas', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({ date: '2026-01-12', isDayOff: false }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toMatch(/startTime y endTime son obligatorios/);
    });

    it('devuelve 400 si startTime no es anterior a endTime', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });

        const response = await POST(
            postRequest({
                date: '2026-01-12',
                isDayOff: false,
                startTime: '11:00',
                endTime: '09:00',
            }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('startTime debe ser anterior a endTime.');
    });

    it('crea la excepción de día libre por defecto (isDayOff true)', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.availabilityException.create.mockResolvedValue({
            id: 'exc-1',
            stylistId: 'stylist-1',
            date: new Date('2026-01-12'),
            isDayOff: true,
            startTime: null,
            endTime: null,
            reason: null,
        });

        const response = await POST(
            postRequest({ date: '2026-01-12' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(mockPrisma.availabilityException.create).toHaveBeenCalledWith({
            data: {
                stylistId: 'stylist-1',
                date: new Date('2026-01-12'),
                isDayOff: true,
                startTime: null,
                endTime: null,
                reason: null,
            },
        });
        expect(data.id).toBe('exc-1');
    });

    it('crea la excepción con un tramo horario cuando isDayOff es false', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.availabilityException.create.mockResolvedValue({
            id: 'exc-2',
            stylistId: 'stylist-1',
            date: new Date('2026-01-12'),
            isDayOff: false,
            startTime: '10:00',
            endTime: '14:00',
            reason: 'Media jornada',
        });

        const response = await POST(
            postRequest({
                date: '2026-01-12',
                isDayOff: false,
                startTime: '10:00',
                endTime: '14:00',
                reason: 'Media jornada',
            }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(mockPrisma.availabilityException.create).toHaveBeenCalledWith({
            data: {
                stylistId: 'stylist-1',
                date: new Date('2026-01-12'),
                isDayOff: false,
                startTime: '10:00',
                endTime: '14:00',
                reason: 'Media jornada',
            },
        });
        expect(data.id).toBe('exc-2');
    });

    it('devuelve 409 si ya existe una excepción para esa fecha', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        const conflictError = new mockPrismaNamespace.PrismaClientKnownRequestError(
            'conflict',
            { code: 'P2002' },
        );
        mockPrisma.availabilityException.create.mockRejectedValue(conflictError);

        const response = await POST(
            postRequest({ date: '2026-01-12' }),
            context('stylist-1'),
        );
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toMatch(/Ya existe una excepción/);
    });

    it('propaga otros errores inesperados', async () => {
        mockPrisma.stylist.findUnique.mockResolvedValue({ id: 'stylist-1' });
        mockPrisma.availabilityException.create.mockRejectedValue(
            new Error('boom'),
        );

        await expect(
            POST(postRequest({ date: '2026-01-12' }), context('stylist-1')),
        ).rejects.toThrow('boom');
    });
});

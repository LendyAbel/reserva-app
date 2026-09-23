import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { VALID_STATUSES } from '@/lib/booking';

interface DriverAdapterErrorMeta {
    driverAdapterError?: {
        cause?: {
            code?: string;
        };
    };
}

export const POST = async (request: Request) => {
    const body = await request.json();
    const {
        stylistId,
        serviceId,
        startAt,
        clientName,
        clientEmail,
        clientPhone,
    } = body;

    if (!stylistId || !serviceId || !startAt || !clientName || !clientEmail) {
        return NextResponse.json(
            {
                error: 'Faltan campos obligatorios: stylistId, serviceId, startAt, clientName, clientEmail.',
            },
            { status: 400 },
        );
    }

    // Comprobar que el estilista ofresca el servicio
    const stylistService = await prisma.stylistService.findUnique({
        where: { stylistId_serviceId: { stylistId, serviceId } },
    });
    if (!stylistService) {
        return NextResponse.json(
            { error: 'Este estilista no ofrece el servicio indicado.' },
            { status: 400 },
        );
    }

    const service = await prisma.service.findUnique({
        where: { id: serviceId },
    });
    if (!service) {
        return NextResponse.json(
            { error: 'Servicio no encontrado.' },
            { status: 404 },
        );
    }

    const start = new Date(startAt);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    const client = await prisma.client.upsert({
        where: { email: clientEmail },
        update: { name: clientName, phone: clientPhone },
        create: { name: clientName, email: clientEmail, phone: clientPhone },
    });

    try {
        const booking = await prisma.booking.create({
            data: {
                stylistId,
                serviceId,
                clientId: client.id,
                startAt: start,
                endAt: end,
                status: 'PENDING',
            },
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const meta = error.meta as DriverAdapterErrorMeta | undefined;
            const pgCode = meta?.driverAdapterError?.cause?.code;
            if (pgCode === '23P01') {
                return NextResponse.json(
                    {
                        error: 'Ese horario ya no está disponible para este estilista. Elige otro horario.',
                    },
                    { status: 409 },
                );
            }
        }

        console.error('Error al crear la reserva:', error);

        return NextResponse.json(
            {
                error: 'No se pudo crear la reserva. Revisa la consola del servidor.',
            },
            { status: 500 },
        );
    }
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export const GET = async (request: Request) => {
    const { searchParams } = new URL(request.url);

    const stylistId = searchParams.get('stylistId');
    const clientName = searchParams.get('clientName');
    const statusParam = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (
        statusParam &&
        !VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
    ) {
        return NextResponse.json(
            {
                error: `status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}.`,
            },
            { status: 400 },
        );
    }

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE),
    );

    const where: Prisma.BookingWhereInput = {};
    if (stylistId) {
        where.stylistId = stylistId;
    }
    if (statusParam) {
        where.status = statusParam as Prisma.BookingWhereInput['status'];
    }
    if (clientName) {
        where.client = { name: { contains: clientName, mode: 'insensitive' } };
    }
    if (dateFrom || dateTo) {
        const parsedFrom = dateFrom ? new Date(dateFrom) : undefined;
        const parsedTo = dateTo ? new Date(dateTo) : undefined;

        if (
            (parsedFrom && Number.isNaN(parsedFrom.getTime())) ||
            (parsedTo && Number.isNaN(parsedTo.getTime()))
        ) {
            return NextResponse.json(
                { error: 'dateFrom y dateTo deben ser fechas válidas.' },
                { status: 400 },
            );
        }

        where.startAt = {
            ...(parsedFrom ? { gte: parsedFrom } : {}),
            ...(parsedTo ? { lte: parsedTo } : {}),
        };
    }

    const [bookings, totalCount] = await Promise.all([
        prisma.booking.findMany({
            where,
            include: {
                stylist: { select: { id: true, name: true } },
                service: {
                    select: { id: true, name: true, durationMinutes: true },
                },
                client: { select: { id: true, name: true, email: true } },
            },
            orderBy: { startAt: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
        bookings,
        pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
        },
    });
};

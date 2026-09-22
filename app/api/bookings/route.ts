import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

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

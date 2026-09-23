import { NextResponse } from 'next/server';
import type { BookingStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { VALID_STATUSES } from '@/lib/booking';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
    CANCELLED: [],
    COMPLETED: [],
    NO_SHOW: [],
};

export const PATCH = async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) => {
    const { id } = await params;
    const body = await request.json();

    const { status } = body;
    if (!status || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
            {
                error: `status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}.`,
            },
            { status: 400 },
        );
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
        return NextResponse.json(
            { error: 'Reserva no encontrada.' },
            { status: 404 },
        );
    }

    if (!ALLOWED_TRANSITIONS[booking.status].includes(status)) {
        return NextResponse.json(
            {
                error: `No se puede cambiar de ${booking.status} a ${status}.`,
            },
            { status: 409 },
        );
    }

    const updated = await prisma.booking.update({
        where: { id },
        data: { status },
    });

    return NextResponse.json(updated);
};

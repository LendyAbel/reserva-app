import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidTime } from '@/lib/schedule';

export const PATCH = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string; id: string }> },
) => {
    const { stylistId, id } = await params;
    const body = await request.json();

    const existing = await prisma.availabilityException.findUnique({
        where: { id },
    });
    if (!existing || existing.stylistId !== stylistId) {
        return NextResponse.json(
            { error: 'Excepción no encontrada.' },
            { status: 404 },
        );
    }

    const isDayOff = body.isDayOff ?? existing.isDayOff;
    const startTime = body.startTime ?? existing.startTime;
    const endTime = body.endTime ?? existing.endTime;
    const reason = body.reason ?? existing.reason;

    if (!isDayOff) {
        if (
            !startTime ||
            !endTime ||
            !isValidTime(startTime) ||
            !isValidTime(endTime)
        ) {
            return NextResponse.json(
                {
                    error: 'Si isDayOff es false, startTime y endTime son obligatorios en formato HH:mm.',
                },
                { status: 400 },
            );
        }
        if (startTime >= endTime) {
            return NextResponse.json(
                { error: 'startTime debe ser anterior a endTime.' },
                { status: 400 },
            );
        }
    }

    const updated = await prisma.availabilityException.update({
        where: { id },
        data: {
            isDayOff,
            startTime: isDayOff ? null : startTime,
            endTime: isDayOff ? null : endTime,
            reason,
        },
    });

    return NextResponse.json(updated);
};

export const DELETE = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string; id: string }> },
) => {
    const { stylistId, id } = await params;

    const existing = await prisma.availabilityException.findUnique({
        where: { id },
    });
    if (!existing || existing.stylistId !== stylistId) {
        return NextResponse.json(
            { error: 'Excepción no encontrada.' },
            { status: 404 },
        );
    }

    await prisma.availabilityException.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
};

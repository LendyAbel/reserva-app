import { NextResponse } from 'next/server';
import type { DayOfWeek } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { isValidTime, timeRangesOverlap } from '@/lib/schedule';

const VALID_DAYS: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];

export const PATCH = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string; id: string }> },
) => {
    const { stylistId, id } = await params;
    const body = await request.json();

    const existing = await prisma.weeklyAvailability.findUnique({
        where: { id },
    });
    if (!existing || existing.stylistId !== stylistId) {
        return NextResponse.json(
            { error: 'Horario no encontrado.' },
            { status: 404 },
        );
    }

    const dayOfWeek: DayOfWeek = body.dayOfWeek ?? existing.dayOfWeek;
    const startTime: string = body.startTime ?? existing.startTime;
    const endTime: string = body.endTime ?? existing.endTime;

    if (!VALID_DAYS.includes(dayOfWeek)) {
        return NextResponse.json(
            {
                error: `dayOfWeek inválido. Valores permitidos: ${VALID_DAYS.join(', ')}.`,
            },
            { status: 400 },
        );
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return NextResponse.json(
            {
                error: 'startTime y endTime deben tener formato HH:mm (ej. "09:00").',
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

    const otherShifts = await prisma.weeklyAvailability.findMany({
        where: { stylistId, dayOfWeek, id: { not: id } },
    });

    const overlaps = otherShifts.some(shift =>
        timeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime),
    );
    if (overlaps) {
        return NextResponse.json(
            {
                error: 'Ese tramo se solapa con otro horario ya definido para ese día.',
            },
            { status: 409 },
        );
    }

    const updated = await prisma.weeklyAvailability.update({
        where: { id },
        data: { dayOfWeek, startTime, endTime },
    });

    return NextResponse.json(updated);
};

export const DELETE = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string; id: string }> },
) => {
    const { stylistId, id } = await params;

    const existing = await prisma.weeklyAvailability.findUnique({
        where: { id },
    });
    if (!existing || existing.stylistId !== stylistId) {
        return NextResponse.json(
            { error: 'Horario no encontrado.' },
            { status: 404 },
        );
    }

    await prisma.weeklyAvailability.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
};

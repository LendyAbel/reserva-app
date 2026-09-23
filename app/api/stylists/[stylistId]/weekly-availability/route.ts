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

export const GET = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string }> },
) => {
    const { stylistId } = await params;

    const stylist = await prisma.stylist.findUnique({
        where: { id: stylistId },
    });
    if (!stylist) {
        return NextResponse.json(
            { error: 'Estilista no encontrado.' },
            { status: 404 },
        );
    }

    const weeklyAvailability = await prisma.weeklyAvailability.findMany({
        where: { stylistId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ weeklyAvailability });
};

export const POST = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string }> },
) => {
    const { stylistId } = await params;
    const body = await request.json();
    const { dayOfWeek, startTime, endTime } = body;

    const stylist = await prisma.stylist.findUnique({
        where: { id: stylistId },
    });
    if (!stylist) {
        return NextResponse.json(
            { error: 'Estilista no encontrado.' },
            { status: 404 },
        );
    }

    if (!dayOfWeek || !VALID_DAYS.includes(dayOfWeek)) {
        return NextResponse.json(
            {
                error: `dayOfWeek inválido. Valores permitidos: ${VALID_DAYS.join(', ')}.`,
            },
            { status: 400 },
        );
    }

    if (
        !startTime ||
        !endTime ||
        !isValidTime(startTime) ||
        !isValidTime(endTime)
    ) {
        return NextResponse.json(
            {
                error: 'startTime y endTime son obligatorios, en formato HH:mm (ej. "09:00").',
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

    const existingShifts = await prisma.weeklyAvailability.findMany({
        where: { stylistId, dayOfWeek },
    });

    const overlaps = existingShifts.some(shift =>
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

    const created = await prisma.weeklyAvailability.create({
        data: { stylistId, dayOfWeek, startTime, endTime },
    });

    return NextResponse.json(created, { status: 201 });
};



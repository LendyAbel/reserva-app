import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { isValidTime } from '@/lib/schedule';

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

    const exceptions = await prisma.availabilityException.findMany({
        where: { stylistId },
        orderBy: { date: 'asc' },
    });

    return NextResponse.json({ exceptions });
};

export const POST = async (
    request: Request,
    { params }: { params: Promise<{ stylistId: string }> },
) => {
    const { stylistId } = await params;
    const body = await request.json();
    const { date, isDayOff, startTime, endTime, reason } = body;

    const stylist = await prisma.stylist.findUnique({
        where: { id: stylistId },
    });
    if (!stylist) {
        return NextResponse.json(
            { error: 'Estilista no encontrado.' },
            { status: 404 },
        );
    }

    if (!date || Number.isNaN(new Date(date).getTime())) {
        return NextResponse.json(
            { error: 'date es obligatoria y debe ser una fecha válida.' },
            { status: 400 },
        );
    }

    const dayOff = isDayOff ?? true;

    if (!dayOff) {
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

    try {
        const created = await prisma.availabilityException.create({
            data: {
                stylistId,
                date: new Date(date),
                isDayOff: dayOff,
                startTime: dayOff ? null : startTime,
                endTime: dayOff ? null : endTime,
                reason: reason ?? null,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return NextResponse.json(
                {
                    error: 'Ya existe una excepción para este estilista en esa fecha. Usa PATCH para editarla.',
                },
                { status: 409 },
            );
        }
        throw error;
    }
};

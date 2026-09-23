import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import type { DayOfWeek } from '@/generated/prisma/enums';

const SLOT_STEP_MINUTES = 15;

const WEEKDAY_MAP: Record<number, DayOfWeek> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
    7: 'SUNDAY',
};

export const GET = async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const stylistId = searchParams.get('stylistId');
    const serviceId = searchParams.get('serviceId');
    const dateParam = searchParams.get('date');

    if (!stylistId || !serviceId || !dateParam) {
        return NextResponse.json(
            {
                error: 'Faltan parámetros obligatorios: stylistId, serviceId, date.',
            },
            { status: 400 },
        );
    }

    const business = await prisma.business.findFirst();
    if (!business) {
        return NextResponse.json(
            { error: 'No hay ningún negocio configurado.' },
            { status: 500 },
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

    const stylistService = await prisma.stylistService.findUnique({
        where: { stylistId_serviceId: { stylistId, serviceId } },
    });
    if (!stylistService) {
        return NextResponse.json(
            { error: 'Este estilista no ofrece el servicio indicado.' },
            { status: 400 },
        );
    }

    // Día solicitado en la URL
    const localDay = DateTime.fromISO(dateParam, {
        zone: business.timezone,
    }).startOf('day');
    if (!localDay.isValid) {
        return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 });
    }

    // La AvailabilityException se guarda como @db.Date, anclada en UTC.
    const dateForLookup = DateTime.fromISO(dateParam, { zone: 'utc' })
        .startOf('day')
        .toJSDate();
    const exception = await prisma.availabilityException.findUnique({
        where: { stylistId_date: { stylistId, date: dateForLookup } },
    });
    if (exception?.isDayOff) {
        return NextResponse.json({ slots: [] });
    }

    let shifts: { startTime: string; endTime: string }[] = [];

    if (
        exception &&
        !exception.isDayOff &&
        exception.startTime &&
        exception.endTime
    ) {
        shifts = [
            { startTime: exception.startTime, endTime: exception.endTime },
        ];
    } else {
        const weeklyAvailability = await prisma.weeklyAvailability.findMany({
            where: { stylistId, dayOfWeek: WEEKDAY_MAP[localDay.weekday] },
        });
        if (weeklyAvailability.length === 0) {
            // Sin horario definido ese día de la semana = no trabaja.
            return NextResponse.json({ slots: [] });
        }

        shifts = weeklyAvailability.map(shift => ({
            startTime: shift.startTime,
            endTime: shift.endTime,
        }));
    }

    const earliestStart = shifts.reduce(
        (min, s) => (s.startTime < min ? s.startTime : min),
        shifts[0].startTime,
    );
    const latestEnd = shifts.reduce(
        (max, s) => (s.endTime > max ? s.endTime : max),
        shifts[0].endTime,
    );

    const [earliestHour, earliestMinute] = earliestStart.split(':').map(Number);
    const [latestHour, latestMinute] = latestEnd.split(':').map(Number);

    const dayRangeStart = localDay.set({
        hour: earliestHour,
        minute: earliestMinute,
    });
    const dayRangeEnd = localDay.set({
        hour: latestHour,
        minute: latestMinute,
    });

    const existingBookings = await prisma.booking.findMany({
        where: {
            stylistId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startAt: { lt: dayRangeEnd.toUTC().toJSDate() },
            endAt: { gt: dayRangeStart.toUTC().toJSDate() },
        },
        select: { startAt: true, endAt: true },
    });

    const slots: { startAt: string; endAt: string }[] = [];

    for (const shift of shifts) {
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);

        const shiftStart = localDay.set({
            hour: startHour,
            minute: startMinute,
        });
        const shiftEnd = localDay.set({ hour: endHour, minute: endMinute });

        let candidateStart = shiftStart;
        while (
            candidateStart.plus({ minutes: service.durationMinutes }) <=
            shiftEnd
        ) {
            const candidateEnd = candidateStart.plus({
                minutes: service.durationMinutes,
            });

            const candidateStartUtc = candidateStart.toUTC().toJSDate();
            const candidateEndUtc = candidateEnd.toUTC().toJSDate();

            const overlaps = existingBookings.some(
                booking =>
                    candidateStartUtc < booking.endAt &&
                    candidateEndUtc > booking.startAt,
            );

            if (!overlaps) {
                slots.push({
                    startAt: candidateStartUtc.toISOString(),
                    endAt: candidateEndUtc.toISOString(),
                });
            }

            candidateStart = candidateStart.plus({
                minutes: SLOT_STEP_MINUTES,
            });
        }
    }

    return NextResponse.json({ slots });
};

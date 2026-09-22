import { prisma } from '../lib/prisma';
import { DayOfWeek } from '../generated/prisma/client';

async function main() {
    // Limpia los datos existentes para poder re-ejecutar el seed sin duplicados.
    // Respeta el orden de dependencias (primero lo que depende de otras tablas).
    await prisma.reminderLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.availabilityException.deleteMany();
    await prisma.weeklyAvailability.deleteMany();
    await prisma.stylistService.deleteMany();
    await prisma.client.deleteMany();
    await prisma.service.deleteMany();
    await prisma.stylist.deleteMany();
    await prisma.business.deleteMany();

    await prisma.business.create({
        data: {
            name: 'Bella Vista Peluquería',
            timezone: 'Europe/Madrid',
        },
    });

    const services = {
        corte: await prisma.service.create({
            data: {
                name: 'Corte de pelo',
                durationMinutes: 30,
                priceCents: 1500,
            },
        }),
        coloracion: await prisma.service.create({
            data: { name: 'Coloración', durationMinutes: 90, priceCents: 4500 },
        }),
        peinado: await prisma.service.create({
            data: { name: 'Peinado', durationMinutes: 45, priceCents: 2000 },
        }),
        tratamiento: await prisma.service.create({
            data: {
                name: 'Tratamiento capilar',
                durationMinutes: 40,
                priceCents: 2500,
            },
        }),
        mechas: await prisma.service.create({
            data: { name: 'Mechas', durationMinutes: 120, priceCents: 6000 },
        }),
        barba: await prisma.service.create({
            data: {
                name: 'Corte de barba',
                durationMinutes: 20,
                priceCents: 1000,
            },
        }),
    };

    const weekdays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
    ];
    const tuesToSat = [
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
    ];
    const monWedFri = [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY];

    await prisma.stylist.create({
        data: {
            name: 'Ana García',
            email: 'ana.garcia@bellavista.test',
            services: {
                create: [
                    { service: { connect: { id: services.corte.id } } },
                    { service: { connect: { id: services.peinado.id } } },
                ],
            },
            weeklyAvailability: {
                create: weekdays.map(dayOfWeek => ({
                    dayOfWeek,
                    startTime: '09:00',
                    endTime: '17:00',
                })),
            },
        },
    });

    await prisma.stylist.create({
        data: {
            name: 'Carlos Ruiz',
            email: 'carlos.ruiz@bellavista.test',
            services: {
                create: [
                    { service: { connect: { id: services.corte.id } } },
                    { service: { connect: { id: services.coloracion.id } } },
                    { service: { connect: { id: services.tratamiento.id } } },
                ],
            },
            weeklyAvailability: {
                create: tuesToSat.map(dayOfWeek => ({
                    dayOfWeek,
                    startTime: '10:00',
                    endTime: '19:00',
                })),
            },
        },
    });

    await prisma.stylist.create({
        data: {
            name: 'Lucía Fernández',
            email: 'lucia.fernandez@bellavista.test',
            services: {
                create: [
                    { service: { connect: { id: services.corte.id } } },
                    { service: { connect: { id: services.coloracion.id } } },
                    { service: { connect: { id: services.mechas.id } } },
                ],
            },
            weeklyAvailability: {
                create: monWedFri.map(dayOfWeek => ({
                    dayOfWeek,
                    startTime: '10:00',
                    endTime: '18:00',
                })),
            },
        },
    });

    await prisma.stylist.create({
        data: {
            name: 'Javier Torres',
            email: 'javier.torres@bellavista.test',
            services: {
                create: [
                    { service: { connect: { id: services.corte.id } } },
                    { service: { connect: { id: services.barba.id } } },
                    { service: { connect: { id: services.peinado.id } } },
                ],
            },
            weeklyAvailability: {
                create: tuesToSat.map(dayOfWeek => ({
                    dayOfWeek,
                    startTime: '09:00',
                    endTime: '14:00',
                })),
            },
        },
    });

    await prisma.stylist.create({
        data: {
            name: 'Marta Sánchez',
            email: 'marta.sanchez@bellavista.test',
            services: {
                create: [
                    { service: { connect: { id: services.coloracion.id } } },
                    { service: { connect: { id: services.tratamiento.id } } },
                    { service: { connect: { id: services.mechas.id } } },
                ],
            },
            weeklyAvailability: {
                create: weekdays.map(dayOfWeek => ({
                    dayOfWeek,
                    startTime: '11:00',
                    endTime: '19:00',
                })),
            },
        },
    });

    console.log('Seed completado: 1 negocio, 6 servicios, 5 estilistas.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async e => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

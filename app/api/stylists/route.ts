import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const GET = async () => {
    try {
        const stylists = await prisma.stylist.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            include: {
                services: {
                    include: { service: true },
                },
            },
        });
        const result = stylists.map(stylist => ({
            id: stylist.id,
            name: stylist.name,
            email: stylist.email,
            phone: stylist.phone,
            services: stylist.services.map(s => s.service),
        }));
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error al listar estilistas:', error);
        return NextResponse.json(
            { error: 'No se pudieron cargar los estilistas.' },
            { status: 500 },
        );
    }
};

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const GET = async () => {
    try {
        const services = await prisma.service.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(services);
    } catch (error) {
        console.error('Error al listar servicios: ', error);
        return NextResponse.json(
            { error: 'No se pudieron cargar los servicios' },
            { status: 500 },
        );
    }
};

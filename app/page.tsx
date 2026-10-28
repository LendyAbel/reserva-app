import Link from 'next/link';

const Home = () => {
    return (
        <main className='flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-5 text-center font-body text-ink'>
            <p className='text-xs uppercase tracking-[0.16em] text-muted'>
                Bella Vista Peluquería
            </p>
            <h1 className='font-display text-4xl leading-tight sm:text-5xl'>
                Reserva tu cita online
            </h1>
            <p className='max-w-md text-[17px] leading-relaxed text-muted'>
                Elige estilista, servicio y hora. Confirmamos al instante por
                email.
            </p>
            <Link
                href='/booking'
                className='mt-2 min-h-14 rounded-[14px] bg-accent px-10 py-4 text-[17px] font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
            >
                Reservar ahora
            </Link>
        </main>
    );
};

export default Home;

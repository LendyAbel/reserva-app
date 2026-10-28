'use client';
import { SubmitEvent, useEffect, useState } from 'react';

type Service = {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
};
type Stylist = { id: string; name: string; services: Service[] };
type Slot = { startAt: string; endAt: string };

const fieldClass =
    'min-h-13 w-full rounded-xl border border-line bg-paper px-3.5 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:bg-cream disabled:text-muted/60';
const labelClass = 'text-sm font-medium text-muted';

const StepTitle = ({ n, children }: { n: number; children: string }) => (
    <div className='flex items-center gap-3'>
        <span className='flex size-7 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white'>
            {n}
        </span>
        <h2 className='font-display text-xl font-semibold lg:text-[22px]'>
            {children}
        </h2>
    </div>
);

const SummaryRow = ({ label, value }: { label: string; value?: string }) => (
    <div className='flex justify-between gap-4 text-base'>
        <dt className='text-[#d9d2c5]'>{label}</dt>
        <dd className='font-semibold'>{value || '—'}</dd>
    </div>
);

const Booking = () => {
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [stylistId, setStylistId] = useState('');
    const [serviceId, setServiceId] = useState('');

    const [date, setDate] = useState('');

    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        fetch('/api/stylists')
            .then(res => res.json())
            .then(data => setStylists(data));
    }, []);

    const selectedStylist = stylists.find(s => s.id === stylistId);
    const services = selectedStylist?.services ?? [];
    const selectedService = services.find(s => s.id === serviceId);

    useEffect(() => {
        if (!stylistId || !serviceId || !date) return;

        const controller = new AbortController();

        fetch(
            `/api/availability?stylistId=${stylistId}&serviceId=${serviceId}&date=${date}`,
            { signal: controller.signal },
        )
            .then(res => res.json())
            .then(data => setSlots(data.slots))
            .catch(error => {
                if (error.name !== 'AbortError') {
                    setSlotsError('No se pudo cargar la disponibilidad.');
                }
            })
            .finally(() => setLoadingSlots(false));

        return () => controller.abort();
    }, [stylistId, serviceId, date]);

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedSlot) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stylistId,
                    serviceId,
                    startAt: selectedSlot.startAt,
                    clientName,
                    clientEmail,
                    clientPhone,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setSubmitError(data.error ?? 'No se pudo crear la reserva.');
                return;
            }

            setSubmitSuccess(true);
        } catch {
            setSubmitError('No se pudo conectar con el servidor.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatSlotLabel = (slot: Slot) =>
        new Date(slot.startAt).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });

    const formatPrice = (cents: number) =>
        `${(cents / 100).toFixed(2).replace('.', ',')} €`;

    const formattedDate = date
        ? new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
          })
        : '';

    if (submitSuccess) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-cream p-5 font-body text-ink'>
                <section className='flex w-full max-w-lg flex-col gap-6 rounded-[20px] border border-[#d9cdbd] bg-paper p-8 sm:p-12'>
                    <div className='flex size-14 items-center justify-center rounded-full bg-brand'>
                        <svg
                            width='28'
                            height='28'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='#ffffff'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            aria-hidden='true'
                        >
                            <path d='M5 12.5l4.5 4.5L19 7.5' />
                        </svg>
                    </div>
                    <div className='flex flex-col gap-2.5'>
                        <h1 className='font-display text-4xl leading-tight sm:text-[40px]'>
                            ¡Reserva creada!
                        </h1>
                        <p className='text-[17px] leading-relaxed text-muted'>
                            Te esperamos. Revisa tu email para más detalles.
                        </p>
                    </div>
                    <dl className='flex flex-col gap-3 border-t border-[#d9cdbd] pt-5 text-base'>
                        <div className='flex justify-between gap-4'>
                            <dt className='text-muted'>Estilista</dt>
                            <dd className='font-semibold'>
                                {selectedStylist?.name}
                            </dd>
                        </div>
                        <div className='flex justify-between gap-4'>
                            <dt className='text-muted'>Servicio</dt>
                            <dd className='font-semibold'>
                                {selectedService?.name}
                            </dd>
                        </div>
                        <div className='flex justify-between gap-4'>
                            <dt className='text-muted'>Fecha y hora</dt>
                            <dd className='font-semibold'>
                                {formattedDate}
                                {selectedSlot &&
                                    ` · ${formatSlotLabel(selectedSlot)}`}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        );
    }

    return (
        <div className='flex min-h-screen flex-col bg-cream font-body text-ink lg:flex-row'>
            <aside className='flex flex-col justify-between gap-10 bg-brand px-5 pb-8 pt-10 text-cream lg:w-110 lg:shrink-0 lg:px-14 lg:py-16'>
                <div className='flex flex-col gap-2.5 lg:gap-5'>
                    <p className='text-xs uppercase tracking-[0.16em] text-[#d9c7b0] lg:text-[13px]'>
                        Reservas
                    </p>
                    <h1 className='font-display text-4xl leading-[1.08] lg:text-[52px] lg:leading-[1.05]'>
                        Reserva tu cita
                    </h1>
                    <p className='max-w-xs text-[15px] leading-normal text-[#d9d2c5] lg:text-[17px] lg:leading-relaxed'>
                        Elige estilista, servicio y hora. Confirmamos al
                        instante por email.
                    </p>
                </div>

                <div className='hidden flex-col gap-4 border-t border-cream/25 pt-7 lg:flex'>
                    <p className='text-[13px] uppercase tracking-[0.16em] text-[#d9c7b0]'>
                        Tu cita
                    </p>
                    <dl className='flex flex-col gap-4'>
                        <SummaryRow
                            label='Estilista'
                            value={selectedStylist?.name}
                        />
                        <SummaryRow
                            label='Servicio'
                            value={selectedService?.name}
                        />
                        <SummaryRow label='Fecha' value={formattedDate} />
                        <SummaryRow
                            label='Hora'
                            value={
                                selectedSlot
                                    ? formatSlotLabel(selectedSlot)
                                    : undefined
                            }
                        />
                    </dl>
                    <div className='mt-1 flex items-baseline justify-between border-t border-cream/25 pt-4'>
                        <span className='text-[#d9d2c5]'>
                            Total
                            {selectedService &&
                                ` · ${selectedService.durationMinutes} min`}
                        </span>
                        <span className='font-display text-3xl'>
                            {selectedService
                                ? formatPrice(selectedService.priceCents)
                                : '—'}
                        </span>
                    </div>
                </div>
            </aside>

            <main className='flex-1 px-5 pb-8 pt-7 lg:px-18 lg:py-14'>
                <form
                    onSubmit={handleSubmit}
                    className='flex max-w-3xl flex-col gap-7 lg:gap-8'
                >
                    <div className='flex flex-col gap-3.5 lg:gap-4'>
                        <StepTitle n={1}>Estilista y servicio</StepTitle>
                        <div className='grid gap-3.5 lg:grid-cols-2 lg:gap-4'>
                            <div className='flex flex-col gap-1.5'>
                                <label htmlFor='stylist' className={labelClass}>
                                    Estilista
                                </label>
                                <select
                                    id='stylist'
                                    name='stylistId'
                                    required
                                    value={stylistId}
                                    onChange={e => {
                                        setStylistId(e.target.value);
                                        setServiceId('');
                                    }}
                                    className={fieldClass}
                                >
                                    <option value=''>
                                        Selecciona un estilista
                                    </option>
                                    {stylists.map(stylist => (
                                        <option
                                            key={stylist.id}
                                            value={stylist.id}
                                        >
                                            {stylist.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label htmlFor='service' className={labelClass}>
                                    Servicio
                                </label>
                                <select
                                    id='service'
                                    name='serviceId'
                                    required
                                    disabled={!stylistId}
                                    value={serviceId}
                                    onChange={e => setServiceId(e.target.value)}
                                    className={fieldClass}
                                >
                                    <option value=''>
                                        Selecciona un servicio
                                    </option>
                                    {services.map(service => (
                                        <option
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name} (
                                            {service.durationMinutes} min ·{' '}
                                            {formatPrice(service.priceCents)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-col gap-3.5 lg:gap-4'>
                        <StepTitle n={2}>Fecha y hora</StepTitle>
                        <div className='flex flex-col gap-1.5 lg:w-80'>
                            <label htmlFor='date' className={labelClass}>
                                Fecha
                            </label>
                            <input
                                type='date'
                                id='date'
                                name='date'
                                required
                                disabled={!serviceId}
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={fieldClass}
                            />
                        </div>

                        {date && stylistId && (
                            <fieldset className='flex flex-col gap-2.5'>
                                <legend className='mb-2.5 text-sm font-medium text-muted'>
                                    Hora disponible
                                </legend>

                                {loadingSlots && (
                                    <p className='text-muted'>
                                        Cargando horarios...
                                    </p>
                                )}
                                {slotsError && (
                                    <p className='text-red-700'>{slotsError}</p>
                                )}
                                {!loadingSlots &&
                                    !slotsError &&
                                    slots.length === 0 && (
                                        <p className='text-muted'>
                                            No hay huecos disponibles ese día.
                                            Prueba otra fecha.
                                        </p>
                                    )}

                                <div className='grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6'>
                                    {slots.map(slot => (
                                        <div key={slot.startAt}>
                                            <input
                                                type='radio'
                                                id={slot.startAt}
                                                name='slot'
                                                value={slot.startAt}
                                                checked={
                                                    selectedSlot?.startAt ===
                                                    slot.startAt
                                                }
                                                onChange={() =>
                                                    setSelectedSlot(slot)
                                                }
                                                className='peer sr-only'
                                            />
                                            <label
                                                htmlFor={slot.startAt}
                                                className='flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-paper text-base font-medium hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:font-semibold peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand'
                                            >
                                                {formatSlotLabel(slot)}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                    </div>

                    {selectedSlot && (
                        <>
                            <div className='flex flex-col gap-3.5 lg:gap-4'>
                                <StepTitle n={3}>Tus datos</StepTitle>
                                <div className='grid gap-3.5 lg:grid-cols-2 lg:gap-4'>
                                    <div className='flex flex-col gap-1.5'>
                                        <label
                                            htmlFor='clientName'
                                            className={labelClass}
                                        >
                                            Nombre completo
                                        </label>
                                        <input
                                            type='text'
                                            id='clientName'
                                            name='clientName'
                                            autoComplete='name'
                                            required
                                            value={clientName}
                                            onChange={e =>
                                                setClientName(e.target.value)
                                            }
                                            className={fieldClass}
                                        />
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
                                        <label
                                            htmlFor='clientEmail'
                                            className={labelClass}
                                        >
                                            Email
                                        </label>
                                        <input
                                            type='email'
                                            id='clientEmail'
                                            name='clientEmail'
                                            autoComplete='email'
                                            required
                                            value={clientEmail}
                                            onChange={e =>
                                                setClientEmail(e.target.value)
                                            }
                                            className={fieldClass}
                                        />
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
                                        <label
                                            htmlFor='clientPhone'
                                            className={labelClass}
                                        >
                                            Teléfono{' '}
                                            <span className='font-normal text-[#6b6156]'>
                                                (opcional)
                                            </span>
                                        </label>
                                        <input
                                            type='tel'
                                            id='clientPhone'
                                            name='clientPhone'
                                            autoComplete='tel'
                                            value={clientPhone}
                                            onChange={e =>
                                                setClientPhone(e.target.value)
                                            }
                                            className={fieldClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            {selectedService && (
                                <div className='flex items-baseline justify-between border-t border-[#d9cdbd] pt-4 lg:hidden'>
                                    <span className='text-[15px] text-muted'>
                                        Total · {selectedService.durationMinutes}{' '}
                                        min
                                    </span>
                                    <span className='font-display text-[28px]'>
                                        {formatPrice(selectedService.priceCents)}
                                    </span>
                                </div>
                            )}

                            {submitError && (
                                <p
                                    className='text-red-700'
                                    aria-live='polite'
                                >
                                    {submitError}
                                </p>
                            )}

                            <button
                                type='submit'
                                disabled={submitting}
                                className='min-h-14 rounded-[14px] bg-accent px-10 text-[17px] font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 lg:self-start'
                            >
                                {submitting
                                    ? 'Reservando...'
                                    : 'Confirmar reserva'}
                            </button>
                        </>
                    )}
                </form>
            </main>
        </div>
    );
};

export default Booking;

import { isValidTime, timeRangesOverlap } from '@/lib/schedule';

describe('isValidTime', () => {
    it('acepta horas válidas en formato HH:mm', () => {
        expect(isValidTime('00:00')).toBe(true);
        expect(isValidTime('09:30')).toBe(true);
        expect(isValidTime('23:59')).toBe(true);
    });

    it('rechaza horas inválidas', () => {
        expect(isValidTime('24:00')).toBe(false);
        expect(isValidTime('9:30')).toBe(false);
        expect(isValidTime('09:60')).toBe(false);
        expect(isValidTime('09-30')).toBe(false);
        expect(isValidTime('')).toBe(false);
    });
});

describe('timeRangesOverlap', () => {
    it('detecta solapamiento parcial', () => {
        expect(timeRangesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(
            true,
        );
    });

    it('detecta un rango contenido dentro de otro', () => {
        expect(timeRangesOverlap('09:00', '12:00', '10:00', '11:00')).toBe(
            true,
        );
    });

    it('no detecta solapamiento cuando los rangos son contiguos', () => {
        expect(timeRangesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(
            false,
        );
    });

    it('no detecta solapamiento cuando los rangos están separados', () => {
        expect(timeRangesOverlap('09:00', '10:00', '11:00', '12:00')).toBe(
            false,
        );
    });
});

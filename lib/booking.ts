export const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'NO_SHOW',
] as const;

export type BookingStatusValue = (typeof VALID_STATUSES)[number];

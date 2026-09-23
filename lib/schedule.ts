const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTime = (value: string): boolean => TIME_REGEX.test(value);

export const timeRangesOverlap = (
    startA: string,
    endA: string,
    startB: string,
    endB: string,
): boolean => startA < endB && endA > startB;
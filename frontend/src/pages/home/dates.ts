const BRUSSELS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
});

const BRUSSELS_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Brussels',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * The Belgian local clock time of a timestamp, as `HH:MM`.
 * @param timestamp - Milliseconds since the epoch.
 * @returns The time string in Europe/Brussels.
 */
export function timeInBrussels(timestamp: number): string {
  return BRUSSELS_TIME.format(new Date(timestamp));
}

/**
 * The Belgian calendar date of a timestamp, as `YYYY-MM-DD`.
 * @param timestamp - Milliseconds since the epoch.
 * @returns The date string in Europe/Brussels.
 */
export function dateInBrussels(timestamp: number): string {
  return BRUSSELS_DATE.format(new Date(timestamp));
}

/**
 * The current date in Belgium, as `YYYY-MM-DD`.
 * @returns Today's date string.
 */
export function todayInBrussels(): string {
  return dateInBrussels(Date.now());
}

/**
 * Tomorrow's date in Belgium, as `YYYY-MM-DD`.
 * @returns Tomorrow's date string.
 */
export function tomorrowInBrussels(): string {
  return dateInBrussels(Date.now() + 24 * 60 * 60 * 1000);
}

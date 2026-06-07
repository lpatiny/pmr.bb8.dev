const BRUSSELS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
});

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

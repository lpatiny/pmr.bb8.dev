const BRUSSELS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
});

/**
 * The current date in Belgium, as `YYYY-MM-DD`.
 * @returns Today's date string.
 */
export function todayInBrussels(): string {
  return BRUSSELS_DATE.format(new Date());
}

/**
 * Tomorrow's date in Belgium, as `YYYY-MM-DD`.
 * @returns Tomorrow's date string.
 */
export function tomorrowInBrussels(): string {
  return BRUSSELS_DATE.format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

import type { AccessibleTrain } from '../../api.ts';

import { todayInBrussels } from './dates.ts';

/** How many trains to reveal per "earlier" / "later" step. */
export const PAGE_SIZE = 8;

/**
 * Index of the first train to show for a loaded day. With an hour selected, the
 * first train at or after that hour; for today with no hour, the next upcoming
 * train; otherwise the start of the day.
 * @param trains - The full day's trains, sorted by departure time.
 * @param date - The selected date `YYYY-MM-DD`.
 * @param hour - The selected departure hour `00`–`23`, or empty.
 * @returns The index to anchor the visible window on.
 */
export function anchorIndex(
  trains: AccessibleTrain[],
  date: string,
  hour: string,
): number {
  if (trains.length === 0) return 0;

  if (hour) {
    const target = `${hour.padStart(2, '0')}:00`;
    const index = trains.findIndex((train) => train.departureTime >= target);
    return index === -1 ? 0 : index;
  }

  if (date === todayInBrussels()) {
    const now = Date.now();
    const index = trains.findIndex((train) => train.departureTimestamp >= now);
    return index === -1 ? Math.max(0, trains.length - PAGE_SIZE) : index;
  }

  return 0;
}

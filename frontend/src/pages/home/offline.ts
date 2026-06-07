import { fetchAccessibleTrains, fetchStations } from '../../api.ts';

import { todayInBrussels, tomorrowInBrussels } from './dates.ts';

/** Outcome of a {@link warmOfflineCache} run. */
export interface SyncResult {
  /** `true` when every today/tomorrow request was refreshed from the network. */
  ok: boolean;
}

/**
 * Pre-fetch everything needed to consult the timetable offline: the station
 * list plus the trains for both travel directions, today and tomorrow. The
 * service worker caches every response, so these stay available without a
 * connection. The requests use the exact same URLs as the live view, so a
 * later offline lookup hits the warmed cache entry.
 *
 * Never throws: a warm-up is best-effort. The returned {@link SyncResult}
 * reports whether the refresh actually reached the network, so the UI can show
 * a sync indicator.
 * @param from - The currently selected origin station id.
 * @param to - The currently selected destination station id.
 * @returns Whether all requests succeeded.
 */
export async function warmOfflineCache(
  from: string,
  to: string,
): Promise<SyncResult> {
  if (from === to || !navigator.onLine) return { ok: false };

  const dates = [todayInBrussels(), tomorrowInBrussels()];
  const directions = [
    { from, to },
    { from: to, to: from },
  ];

  const tasks: Array<Promise<unknown>> = [fetchStations()];
  for (const direction of directions) {
    for (const date of dates) {
      tasks.push(fetchAccessibleTrains({ ...direction, date }));
    }
  }

  const results = await Promise.allSettled(tasks);
  return { ok: results.every((result) => result.status === 'fulfilled') };
}

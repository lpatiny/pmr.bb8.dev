import type { AccessibleTrain } from '../../api.ts';
import { fetchDayTrains, fetchStations } from '../../api.ts';

import { todayInBrussels, tomorrowInBrussels } from './dates.ts';

/** Outcome of a {@link warmOfflineCache} run. */
export interface SyncResult {
  /** `true` when every today/tomorrow request was refreshed from the network. */
  ok: boolean;
  /** Number of accessible trains today for the requested direction. */
  today: number;
  /** Number of accessible trains tomorrow for the requested direction. */
  tomorrow: number;
}

/** Options for {@link warmOfflineCache}. */
export interface WarmOptions {
  /**
   * A combo already loaded by the live view, reused here instead of being
   * refetched (avoids a second full-day request for what is already on screen).
   */
  preloaded?: {
    from: string;
    to: string;
    date: string;
    trains: AccessibleTrain[];
  };
}

/**
 * Pre-fetch the full-day timetables needed to consult and page through the
 * schedule offline: today and tomorrow, for both travel directions, plus the
 * station list. The service worker caches every response, so the data stays
 * available — and pageable — without a connection.
 *
 * Never throws: a warm-up is best-effort. The returned {@link SyncResult}
 * reports whether the refresh reached the network and how many trains run today
 * and tomorrow for the requested direction.
 * @param from - The currently selected origin station id.
 * @param to - The currently selected destination station id.
 * @param options - Optional already-loaded combo to reuse.
 * @returns Whether all requests succeeded and the today/tomorrow counts.
 */
export async function warmOfflineCache(
  from: string,
  to: string,
  options: WarmOptions = {},
): Promise<SyncResult> {
  if (from === to || !navigator.onLine) {
    return { ok: false, today: 0, tomorrow: 0 };
  }

  const { preloaded } = options;
  const today = todayInBrussels();
  const tomorrow = tomorrowInBrussels();

  const load = (
    fromId: string,
    toId: string,
    date: string,
  ): Promise<AccessibleTrain[]> => {
    if (
      preloaded?.from === fromId &&
      preloaded.to === toId &&
      preloaded.date === date
    ) {
      return Promise.resolve(preloaded.trains);
    }
    return fetchDayTrains({ from: fromId, to: toId, date });
  };

  const results = await Promise.allSettled([
    load(from, to, today),
    load(from, to, tomorrow),
    load(to, from, today),
    load(to, from, tomorrow),
    fetchStations(),
  ]);

  const count = (result: (typeof results)[number]): number =>
    result.status === 'fulfilled' ? result.value.length : 0;

  return {
    ok: results.every((result) => result.status === 'fulfilled'),
    today: count(results[0]),
    tomorrow: count(results[1]),
  };
}

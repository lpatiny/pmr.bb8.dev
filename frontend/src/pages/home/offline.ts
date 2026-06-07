import type { AccessibleTrain } from '../../api.ts';
import { fetchDayTrains, fetchStations } from '../../api.ts';

import { todayInBrussels, tomorrowInBrussels } from './dates.ts';
import { isStoredDayFresh, loadStoredDay, storeDay } from './storage.ts';

/** Outcome of a {@link warmOfflineCache} run. */
export interface SyncResult {
  /** `true` when every today/tomorrow timetable is available (fresh or fetched). */
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
  /**
   * Called as each of the today/tomorrow timetables finishes, so the UI can
   * show the sync progressing.
   */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Make sure the full-day timetables needed to consult and page through the
 * schedule offline are available: today and tomorrow, for both directions, plus
 * the station list. Days already refreshed today are read from localStorage
 * (no network, even online); only stale or missing days are fetched. The day
 * timetables are loaded one after another so the progress is visible.
 *
 * Never throws: a warm-up is best-effort. The returned {@link SyncResult}
 * reports whether every day is available and how many trains run today and
 * tomorrow for the requested direction.
 * @param from - The currently selected origin station id.
 * @param to - The currently selected destination station id.
 * @param options - Optional already-loaded combo to reuse, and a progress hook.
 * @returns Whether all days are available and the today/tomorrow counts.
 */
export async function warmOfflineCache(
  from: string,
  to: string,
  options: WarmOptions = {},
): Promise<SyncResult> {
  if (from === to) {
    return { ok: false, today: 0, tomorrow: 0 };
  }

  const { preloaded, onProgress } = options;
  const today = todayInBrussels();
  const tomorrow = tomorrowInBrussels();

  const combos = [
    { from, to, date: today },
    { from, to, date: tomorrow },
    { from: to, to: from, date: today },
    { from: to, to: from, date: tomorrow },
  ];

  const stationsPromise = fetchStations().then(
    () => true,
    () => false,
  );

  let ok = true;
  let done = 0;
  const trainsByCombo: AccessibleTrain[][] = [];
  for (const combo of combos) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential so the progress steps are visible
      trainsByCombo.push(await loadDay(combo, preloaded));
    } catch {
      ok = false;
      trainsByCombo.push([]);
    }
    done += 1;
    onProgress?.(done, combos.length);
  }

  ok = (await stationsPromise) && ok;

  return {
    ok,
    today: trainsByCombo[0]?.length ?? 0,
    tomorrow: trainsByCombo[1]?.length ?? 0,
  };
}

/**
 * Resolve a single day's timetable, preferring (in order) the on-screen view,
 * a same-day localStorage entry, then the network.
 * @param combo - The direction and date to load.
 * @param preloaded - The combo already loaded by the live view, if any.
 * @returns The day's trains.
 */
async function loadDay(
  combo: { from: string; to: string; date: string },
  preloaded: WarmOptions['preloaded'],
): Promise<AccessibleTrain[]> {
  const { from, to, date } = combo;

  if (
    preloaded?.from === from &&
    preloaded.to === to &&
    preloaded.date === date
  ) {
    storeDay(from, to, date, preloaded.trains);
    return preloaded.trains;
  }

  if (isStoredDayFresh(from, to, date)) {
    return loadStoredDay(from, to, date) ?? [];
  }

  if (!navigator.onLine) {
    // Offline and stale: fall back to whatever is stored rather than failing.
    const stored = loadStoredDay(from, to, date);
    if (stored) return stored;
    throw new Error('offline');
  }

  const trains = await fetchDayTrains({ from, to, date });
  storeDay(from, to, date, trains);
  return trains;
}

import type { AccessibleTrain } from '../../api.ts';

import { dateInBrussels, todayInBrussels } from './dates.ts';

const STORAGE_KEY = 'pmr-timetables-v2';
const LAST_TRIP_KEY = 'pmr-last-trip-v1';

interface LastTrip {
  from: string;
  to: string;
}

/**
 * Read the last origin/destination the user selected, so the app reopens on the
 * same trip instead of always defaulting to Ostende → Bruges.
 * @returns The stored trip, or `null` when nothing is stored.
 */
export function loadLastTrip(): LastTrip | null {
  try {
    const raw = localStorage.getItem(LAST_TRIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastTrip>;
    if (typeof parsed.from === 'string' && typeof parsed.to === 'string') {
      return { from: parsed.from, to: parsed.to };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the last origin/destination the user selected.
 * @param from - Origin station id.
 * @param to - Destination station id.
 */
export function saveLastTrip(from: string, to: string): void {
  try {
    localStorage.setItem(LAST_TRIP_KEY, JSON.stringify({ from, to }));
  } catch {
    // Ignore quota errors or private-mode restrictions: this is best-effort.
  }
}

interface StoredDay {
  date: string;
  trains: AccessibleTrain[];
  /** When this day was last refreshed from the network (epoch ms). */
  savedAt: number;
}

type Store = Record<string, StoredDay>;

/**
 * Read a previously persisted day timetable, so it can be shown instantly —
 * even offline — before the network refresh completes.
 * @param from - Origin station id.
 * @param to - Destination station id.
 * @param date - Travel date `YYYY-MM-DD`.
 * @returns The stored trains, or `null` when nothing is stored.
 */
export function loadStoredDay(
  from: string,
  to: string,
  date: string,
): AccessibleTrain[] | null {
  const entry = readStore()[keyFor(from, to, date)];
  return entry ? entry.trains : null;
}

/**
 * Persist a day timetable for offline use and drop entries for past days so
 * the store does not grow without bound.
 * @param from - Origin station id.
 * @param to - Destination station id.
 * @param date - Travel date `YYYY-MM-DD`.
 * @param trains - The full day's trains to store.
 */
export function storeDay(
  from: string,
  to: string,
  date: string,
  trains: AccessibleTrain[],
): void {
  const today = todayInBrussels();
  const store: Store = {};
  // Keep only entries for today onwards, so the store does not grow forever.
  for (const [key, value] of Object.entries(readStore())) {
    if (value.date >= today) store[key] = value;
  }
  store[keyFor(from, to, date)] = { date, trains, savedAt: Date.now() };
  writeStore(store);
}

/**
 * Whether a stored day timetable was refreshed today (Belgian time). The app
 * syncs once per day: a same-day entry is used as-is, even online; an older one
 * is considered stale and refreshed.
 * @param from - Origin station id.
 * @param to - Destination station id.
 * @param date - Travel date `YYYY-MM-DD`.
 * @returns `true` when stored and last refreshed today.
 */
export function isStoredDayFresh(
  from: string,
  to: string,
  date: string,
): boolean {
  const entry = readStore()[keyFor(from, to, date)];
  return entry ? dateInBrussels(entry.savedAt) === todayInBrussels() : false;
}

function keyFor(from: string, to: string, date: string): string {
  return `${from}|${to}|${date}`;
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors or private-mode restrictions: caching is best-effort.
  }
}

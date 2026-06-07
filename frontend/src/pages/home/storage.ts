import type { AccessibleTrain } from '../../api.ts';

import { todayInBrussels } from './dates.ts';

const STORAGE_KEY = 'pmr-timetables-v1';

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
 * Age of a stored day timetable, used to decide whether it is still fresh
 * enough to use without going to the network.
 * @param from - Origin station id.
 * @param to - Destination station id.
 * @param date - Travel date `YYYY-MM-DD`.
 * @returns Milliseconds since it was stored, or `null` when nothing is stored.
 */
export function storedDayAge(
  from: string,
  to: string,
  date: string,
): number | null {
  const entry = readStore()[keyFor(from, to, date)];
  return entry ? Date.now() - entry.savedAt : null;
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

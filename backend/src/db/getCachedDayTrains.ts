import type { AccessibleTrain } from '../bikeontrain.ts';
import { getDayTrains } from '../bikeontrain.ts';
import { toSearchWindow } from '../bikeontrainClient.ts';
import type { Station } from '../stations.ts';

import type { DB, DayTrainsRow } from './getDB.ts';

/** Default freshness window for a today/future day, in ms (10 minutes). */
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/** Fetches a whole day of accessible trains from the upstream service. */
export type DayTrainsFetcher = (
  from: Station,
  to: Station,
  date: string,
) => Promise<AccessibleTrain[]>;

/** Options for {@link getCachedDayTrains}, mostly for tests. */
export interface CachedDayTrainsOptions {
  /**
   * How long a cached entry for today or a future date stays fresh, in ms. Past
   * days never expire. Defaults to the `CACHE_TTL_MS` env var, else 10 minutes.
   * @default 600000
   */
  ttlMs?: number;
  /** Fetches a whole day on a cache miss. Defaults to the BikeOnTrain client. */
  fetcher?: DayTrainsFetcher;
  /** Returns the current time in ms. Injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
  /**
   * Bypass the cache and always re-fetch from the upstream service, refreshing
   * the stored entry (used by the manual "refresh" action to pull live delays
   * and cancellations). Concurrent forced misses still share one request.
   * @default false
   */
  force?: boolean;
}

/** Concurrent misses for the same day share a single upstream request. */
const inFlight = new Map<string, Promise<AccessibleTrain[]>>();

/**
 * Return a whole day of accessible trains: from the shared SQLite cache when
 * still fresh, otherwise from the upstream service (storing the result for next
 * time). Many computers asking for the same day hit the upstream SNCB endpoint
 * at most once per freshness window.
 * @param db - The database instance.
 * @param from - The origin station.
 * @param to - The destination station.
 * @param date - The travel date `YYYY-MM-DD` (Belgian local time).
 * @param options - TTL, fetcher and clock overrides (mostly for tests).
 * @returns Every accessible direct train of that day, soonest first.
 */
export async function getCachedDayTrains(
  db: DB,
  from: Station,
  to: Station,
  date: string,
  options: CachedDayTrainsOptions = {},
): Promise<AccessibleTrain[]> {
  const {
    ttlMs = resolveTtlMs(),
    fetcher = getDayTrains,
    now = Date.now,
    force = false,
  } = options;

  const cached = force ? null : readFresh(db, from.id, to.id, date, ttlMs, now());
  if (cached) return cached;

  const key = `${from.id}|${to.id}|${date}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const pending = (async () => {
    const trains = await fetcher(from, to, date);
    db.upsertDayTrains.run(from.id, to.id, date, JSON.stringify(trains), now());
    return trains;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, pending);
  return pending;
}

/**
 * Read a cached day, returning it only when the entry is still fresh.
 * @param db - The database instance.
 * @param fromId - The origin station id.
 * @param toId - The destination station id.
 * @param date - The travel date `YYYY-MM-DD`.
 * @param ttlMs - The freshness window for today/future days, in ms.
 * @param now - The current time in ms.
 * @returns The cached trains, or `null` on a miss or stale entry.
 */
function readFresh(
  db: DB,
  fromId: string,
  toId: string,
  date: string,
  ttlMs: number,
  now: number,
): AccessibleTrain[] | null {
  const row = db.selectDayTrains.get(fromId, toId, date) as
    | DayTrainsRow
    | undefined;
  if (!row) return null;
  if (!isFresh(date, row.fetchedAt, ttlMs, now)) return null;
  return JSON.parse(row.trains) as AccessibleTrain[];
}

/**
 * Whether a cached entry is still usable. A day in the past never changes, so
 * it stays fresh forever; today and future days expire after the TTL.
 * @param date - The cached day `YYYY-MM-DD` (Belgian local time).
 * @param fetchedAt - When the entry was stored, in ms.
 * @param ttlMs - The freshness window for today/future days, in ms.
 * @param now - The current time in ms.
 * @returns `true` when the entry may be served from the cache.
 */
function isFresh(
  date: string,
  fetchedAt: number,
  ttlMs: number,
  now: number,
): boolean {
  if (date < toSearchWindow(now).date) return true;
  return now - fetchedAt < ttlMs;
}

/**
 * Resolve the freshness window from the `CACHE_TTL_MS` env var, falling back to
 * the default when it is missing or invalid.
 * @returns The TTL in milliseconds.
 */
function resolveTtlMs(): number {
  const raw = process.env.CACHE_TTL_MS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return DEFAULT_TTL_MS;
}

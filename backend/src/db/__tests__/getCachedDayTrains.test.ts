import { expect, test, vi } from 'vitest';

import type { AccessibleTrain } from '../../bikeontrain.ts';
import { toSearchWindow } from '../../bikeontrainClient.ts';
import type { Station } from '../../stations.ts';
import { getCachedDayTrains } from '../getCachedDayTrains.ts';
import { getTempDB } from '../getDB.ts';

const from: Station = { id: 'A', name: 'A', standardname: 'A', place: '0,0' };
const to: Station = { id: 'B', name: 'B', standardname: 'B', place: '0,0' };

function train(trainNumber: string): AccessibleTrain {
  return {
    trainType: 'IC',
    trainNumber,
    headsign: 'Bruges',
    departureTime: '10:00',
    arrivalTime: '10:15',
    departureTimestamp: 0,
    durationMinutes: 15,
    departurePlatform: '1',
    arrivalPlatform: '2',
    bikeSpaces: 8,
    hasPrmSection: true,
    hasPrmToilets: true,
    isCancelled: false,
    departureDelay: 0,
    arrivalDelay: 0,
    realTime: true,
  };
}

function countingFetcher() {
  let calls = 0;
  return vi.fn(async () => {
    calls += 1;
    return [train(`call-${calls}`)];
  });
}

test('serves a fresh entry from the cache without re-fetching', async () => {
  const db = await getTempDB();
  let current = Date.UTC(2026, 5, 7, 10, 0, 0);
  const today = toSearchWindow(current).date;
  const fetcher = countingFetcher();
  const options = { ttlMs: 60_000, fetcher, now: () => current };

  const first = await getCachedDayTrains(db, from, to, today, options);
  current += 30_000;
  const second = await getCachedDayTrains(db, from, to, today, options);

  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(first[0]?.trainNumber).toBe('call-1');
  expect(second[0]?.trainNumber).toBe('call-1');
  db.close();
});

test('re-fetches a today entry once the TTL expires', async () => {
  const db = await getTempDB();
  let current = Date.UTC(2026, 5, 7, 10, 0, 0);
  const today = toSearchWindow(current).date;
  const fetcher = countingFetcher();
  const options = { ttlMs: 60_000, fetcher, now: () => current };

  await getCachedDayTrains(db, from, to, today, options);
  current += 120_000;
  const second = await getCachedDayTrains(db, from, to, today, options);

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(second[0]?.trainNumber).toBe('call-2');
  db.close();
});

test('force bypasses a fresh entry, re-fetches and updates the stored day', async () => {
  const db = await getTempDB();
  const current = Date.UTC(2026, 5, 7, 10, 0, 0);
  const today = toSearchWindow(current).date;
  const fetcher = countingFetcher();
  const options = { ttlMs: 60_000, fetcher, now: () => current };

  const first = await getCachedDayTrains(db, from, to, today, options);
  const forced = await getCachedDayTrains(db, from, to, today, {
    ...options,
    force: true,
  });
  // A subsequent normal read must serve the refreshed entry from the cache.
  const cached = await getCachedDayTrains(db, from, to, today, options);

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(first[0]?.trainNumber).toBe('call-1');
  expect(forced[0]?.trainNumber).toBe('call-2');
  expect(cached[0]?.trainNumber).toBe('call-2');
  db.close();
});

test('never expires a day in the past', async () => {
  const db = await getTempDB();
  let current = Date.UTC(2026, 5, 7, 10, 0, 0);
  const fetcher = countingFetcher();
  const options = { ttlMs: 60_000, fetcher, now: () => current };

  await getCachedDayTrains(db, from, to, '2026-06-01', options);
  current += 24 * 60 * 60 * 1000;
  const second = await getCachedDayTrains(db, from, to, '2026-06-01', options);

  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(second[0]?.trainNumber).toBe('call-1');
  db.close();
});

test('coalesces concurrent misses into a single upstream fetch', async () => {
  const db = await getTempDB();
  const current = Date.UTC(2026, 5, 7, 10, 0, 0);
  const today = toSearchWindow(current).date;
  let resolveFetch!: (trains: AccessibleTrain[]) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<AccessibleTrain[]>((resolve) => {
        resolveFetch = resolve;
      }),
  );
  const options = { fetcher, now: () => current };

  const first = getCachedDayTrains(db, from, to, today, options);
  const second = getCachedDayTrains(db, from, to, today, options);
  resolveFetch([train('only')]);
  const [a, b] = await Promise.all([first, second]);

  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(a[0]?.trainNumber).toBe('only');
  expect(b[0]?.trainNumber).toBe('only');
  db.close();
});

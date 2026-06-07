import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, expect, test, vi } from 'vitest';

import { getAccessibleTrains, parseAccessibleTrains } from '../bikeontrain.ts';

const raw = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/oostende-bruges.json'), 'utf8'),
);

test('keeps only the green (score 4) direct trains, sorted by departure', () => {
  const trains = parseAccessibleTrains(raw);

  // The fixture has 4 itineraries (scores 4, 3, 4, 4); the score-3 one is dropped.
  expect(trains.map((t) => t.trainNumber)).toStrictEqual([
    '1808',
    '508',
    '1809',
  ]);
});

test('maps every field of the first accessible train', () => {
  const [first] = parseAccessibleTrains(raw);

  expect(first).toStrictEqual({
    trainType: 'IC',
    trainNumber: '1808',
    headsign: 'Gand-Saint-Pierre & Anvers-Central',
    departureTime: '08:09',
    arrivalTime: '08:22',
    departureTimestamp: 1780812540000,
    durationMinutes: 13,
    departurePlatform: '5',
    arrivalPlatform: '9',
    bikeSpaces: 14,
    hasPrmSection: true,
    hasPrmToilets: true,
  });
});

test('every returned train is fully accessible', () => {
  const trains = parseAccessibleTrains(raw);

  for (const train of trains) {
    expect(train.hasPrmSection).toBe(true);
    expect(train.bikeSpaces).toBeGreaterThan(0);
  }
});

test('returns an empty array for an empty or malformed response', () => {
  expect(parseAccessibleTrains({})).toStrictEqual([]);
  expect(parseAccessibleTrains(null)).toStrictEqual([]);
  expect(parseAccessibleTrains({ hacon: { itineraries: [] } })).toStrictEqual(
    [],
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function greenPage(numbers: number[], startTimes: number[]) {
  const itineraries = numbers.map((number, index) => ({
    itineraryScore: 4,
    isCancelled: false,
    duration: 780,
    legs: [
      {
        transitLeg: true,
        route: 'IC',
        tripShortName: String(number),
        headsign: 'Test',
        startTime: startTimes[index],
        from: { departureHr: '00:00', platformCode: '1' },
        to: { arrivalHr: '00:13', platformCode: '2' },
        accessibilityData: {
          trainAccessibility: {
            space: 10,
            hasPrmSection: true,
            hasPrmToilets: true,
          },
        },
      },
    ],
  }));
  return Response.json({ hacon: { itineraries } });
}

test('pages forward in time to collect up to 10 accessible trains', async () => {
  const hour = 3_600_000;
  let next = 1_700_000_000_000;
  let number = 1;

  const fetchMock = vi.fn(() => {
    // Each page returns two accessible trains, 10 minutes apart.
    const page = greenPage([number, number + 1], [next, next + 600_000]);
    number += 2;
    next += hour;
    return Promise.resolve(page);
  });
  vi.stubGlobal('fetch', fetchMock);

  const trains = await getAccessibleTrains('oostende-bruges');

  // 2 trains per page → 5 upstream requests to reach the limit of 10.
  expect(trains).toHaveLength(10);
  expect(fetchMock).toHaveBeenCalledTimes(5);
  expect(trains.map((train) => train.trainNumber)).toStrictEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
  ]);
});

test('stops paging when the window stops advancing', async () => {
  // The same page on every request: no new departures → must not loop forever.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        greenPage([42, 43], [1_700_000_000_000, 1_700_000_600_000]),
      ),
    ),
  );

  const trains = await getAccessibleTrains('bruges-oostende');

  expect(trains.map((train) => train.trainNumber)).toStrictEqual(['42', '43']);
});

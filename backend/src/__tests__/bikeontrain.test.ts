import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, expect, test, vi } from 'vitest';

import {
  getAccessibleTrains,
  getDayTrains,
  parseAccessibleTrains,
} from '../bikeontrain.ts';

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

const FROM = {
  id: '8891702',
  name: 'Ostende',
  standardname: 'Oostende',
  place: '2.92581,51.22821',
};
const TO = {
  id: '8891009',
  name: 'Bruges',
  standardname: 'Brugge',
  place: '3.21673,51.19723',
};

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

  const trains = await getAccessibleTrains({ from: FROM, to: TO });

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

  const trains = await getAccessibleTrains({ from: TO, to: FROM });

  expect(trains.map((train) => train.trainNumber)).toStrictEqual(['42', '43']);
});

test('before mode returns the latest accessible trains before a timestamp', async () => {
  const hour = 3_600_000;
  const start = 1_700_000_000_000;
  let page = 0;

  // One train per page, each an hour later than the previous.
  const fetchMock = vi.fn(() => {
    const departure = start + page * hour;
    page += 1;
    return Promise.resolve(greenPage([page], [departure]));
  });
  vi.stubGlobal('fetch', fetchMock);

  const before = start + hour * 2 + 600_000; // after the +2h train, before the +3h one
  const trains = await getAccessibleTrains({ from: FROM, to: TO, before });

  expect(trains.every((train) => train.departureTimestamp < before)).toBe(true);
  expect(trains.map((train) => train.departureTimestamp)).toStrictEqual([
    start,
    start + hour,
    start + hour * 2,
  ]);
});

test('after mode starts the search after the given timestamp', async () => {
  const after = 1_700_000_000_000;
  const fetchMock = vi.fn<(url: string | URL | Request) => Promise<Response>>(
    () =>
      Promise.resolve(greenPage([7, 8], [after + 600_000, after + 1_200_000])),
  );
  vi.stubGlobal('fetch', fetchMock);

  const trains = await getAccessibleTrains({ from: FROM, to: TO, after });

  expect(trains.every((train) => train.departureTimestamp > after)).toBe(true);
  // The first upstream request must carry a date/hour window (not "now").
  const url = fetchMock.mock.calls[0]?.[0] as string;
  expect(url).toContain('arriveBy=false');
  expect(url).toContain('date=');
});

// A UTC timestamp on 2026-06-07. Europe/Brussels is UTC+2 in June, so a UTC
// hour h maps to local h+2.
function june7Utc(hour: number, minute = 0) {
  return Date.UTC(2026, 5, 7, hour, minute);
}

test('getDayTrains collects a full day and stops at the next midnight', async () => {
  const pages = [
    greenPage([1, 2], [june7Utc(6, 0), june7Utc(6, 30)]), // 08:00 / 08:30 local
    greenPage([3, 4], [june7Utc(20, 0), june7Utc(20, 30)]), // 22:00 / 22:30
    greenPage([5, 6], [june7Utc(22, 30), june7Utc(23, 0)]), // next day local
  ];
  let page = 0;
  const fetchMock = vi.fn(() =>
    Promise.resolve(pages[Math.min(page++, pages.length - 1)]),
  );
  vi.stubGlobal('fetch', fetchMock);

  const trains = await getDayTrains(FROM, TO, '2026-06-07');

  // Trains 5 and 6 fall on 2026-06-08 and must be dropped.
  expect(trains.map((train) => train.trainNumber)).toStrictEqual([
    '1',
    '2',
    '3',
    '4',
  ]);
});

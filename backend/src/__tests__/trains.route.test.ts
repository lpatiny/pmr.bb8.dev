import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, expect, test, vi } from 'vitest';

import { buildApp } from '../app.ts';

const fixture = readFileSync(
  join(import.meta.dirname, 'data/oostende-bruges.json'),
);

afterEach(() => {
  vi.unstubAllGlobals();
});

test('GET /api/v1/trains returns the accessible trains for a station pair', async () => {
  const fetchMock = vi.fn<(url: string | URL | Request) => Promise<Response>>(
    () => Promise.resolve(new Response(fixture, { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=8891009',
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.from).toBe('8891702');
  expect(body.to).toBe('8891009');
  expect(
    body.trains.map((train: { trainNumber: string }) => train.trainNumber),
  ).toStrictEqual(['1808', '508', '1809']);

  // The first upstream call must use the requested station ids.
  const url = fetchMock.mock.calls[0]?.[0] as string;
  expect(url).toContain('fromId=8891702');
  expect(url).toContain('toId=8891009');

  await app.close();
});

test('GET /api/v1/trains rejects an unknown station', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=0000000',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toStrictEqual({ error: 'Gare inconnue.' });

  await app.close();
});

test('GET /api/v1/trains?full=true returns the whole requested day', async () => {
  const fetchMock = vi.fn<(url: string | URL | Request) => Promise<Response>>(
    () => Promise.resolve(new Response(fixture, { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=8891009&date=2026-06-07&full=true',
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.date).toBe('2026-06-07');
  expect(
    body.trains.map((train: { trainNumber: string }) => train.trainNumber),
  ).toStrictEqual(['1808', '508', '1809']);

  // The whole-day search must start at midnight, not "now".
  const url = fetchMock.mock.calls[0]?.[0] as string;
  expect(url).toContain('date=2026-06-07');
  expect(url).toContain('hour=00');

  await app.close();
});

test('GET /api/v1/trains rejects full without a date', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=8891009&full=true',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toStrictEqual({
    error: 'Le paramètre « full » requiert une date.',
  });

  await app.close();
});

test('GET /api/v1/trains rejects identical from and to', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=8891702',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toStrictEqual({
    error: 'Choisissez deux gares différentes.',
  });

  await app.close();
});

test('GET /api/v1/trains returns 502 when the SNCB service fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('boom', { status: 500 })),
  );

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains?from=8891702&to=8891009',
  });

  expect(response.statusCode).toBe(502);
  expect(response.json()).toStrictEqual({
    error: 'Impossible de contacter le service SNCB.',
  });

  await app.close();
});

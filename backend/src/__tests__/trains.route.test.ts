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

test('GET /api/v1/trains/:direction returns the accessible trains', async () => {
  const fetchMock = vi.fn<(url: string | URL | Request) => Promise<Response>>(
    () => Promise.resolve(new Response(fixture, { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains/oostende-bruges',
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.direction).toBe('oostende-bruges');
  expect(
    body.trains.map((train: { trainNumber: string }) => train.trainNumber),
  ).toStrictEqual(['1808', '508', '1809']);

  // The reverse direction must query the swapped from/to station ids.
  fetchMock.mockClear();
  await app.inject({ method: 'GET', url: '/api/v1/trains/bruges-oostende' });
  const reverseUrl = fetchMock.mock.calls[0]?.[0] as string;
  expect(reverseUrl).toContain('fromId=8891009');
  expect(reverseUrl).toContain('toId=8891702');

  await app.close();
});

test('GET /api/v1/trains/:direction returns 502 when the SNCB service fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('boom', { status: 500 })),
  );

  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/trains/oostende-bruges',
  });

  expect(response.statusCode).toBe(502);
  expect(response.json()).toStrictEqual({
    error: 'Impossible de contacter le service SNCB.',
  });

  await app.close();
});

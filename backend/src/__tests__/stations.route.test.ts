import { expect, test } from 'vitest';

import { buildApp } from '../app.ts';

test('GET /api/v1/stations returns the full station list', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/stations',
  });

  expect(response.statusCode).toBe(200);
  const stations = response.json();
  expect(stations.length).toBeGreaterThan(500);

  const oostende = stations.find(
    (station: { id: string; name: string }) => station.id === '8891702',
  );
  expect(oostende?.name).toBe('Ostende');

  await app.close();
});

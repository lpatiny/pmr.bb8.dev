import { expect, test } from 'vitest';

import { buildApp } from '../app.ts';

test('GET /api/health returns ok', async () => {
  const app = await buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toStrictEqual({ status: 'ok' });

  await app.close();
});

test('GET /api/v1/trains requires from and to', async () => {
  const app = await buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/v1/trains' });

  expect(response.statusCode).toBe(400);

  await app.close();
});

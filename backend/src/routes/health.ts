import { Type } from '@sinclair/typebox';

import type { FastifyTyped } from '../types.ts';

/**
 * Register the health-check route.
 * @param fastify - The Fastify instance to register the route on.
 */
export default async function healthRoutes(fastify: FastifyTyped) {
  fastify.get(
    '/api/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Health check',
        response: {
          200: Type.Object({ status: Type.Literal('ok') }),
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  );
}

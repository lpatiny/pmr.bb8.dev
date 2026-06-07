import { existsSync } from 'node:fs';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';

import healthRoutes from './routes/health.ts';
import trainRoutes from './routes/trains.ts';
import type { FastifyTyped } from './types.ts';

/**
 * Build and configure the Fastify application (without starting to listen).
 * Used both by the server entry point and by the tests.
 * @returns A ready-to-use Fastify instance.
 */
export async function buildApp(): Promise<FastifyTyped> {
  const fastify = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Oostende ↔ Bruges — trains accessibles',
        version: '1.0.0',
      },
    },
  });
  await fastify.register(fastifySwaggerUi, { routePrefix: '/docs' });

  await fastify.register(healthRoutes);
  await fastify.register(trainRoutes);

  const frontendDist = join(import.meta.dirname, '../../frontend/dist');
  if (existsSync(frontendDist)) {
    await fastify.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      decorateReply: true,
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  return fastify;
}

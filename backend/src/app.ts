import { existsSync } from 'node:fs';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';

import healthRoutes from './routes/health.ts';
import stationRoutes from './routes/stations.ts';
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
  await fastify.register(stationRoutes);
  await fastify.register(trainRoutes);

  const frontendDist = join(import.meta.dirname, '../../frontend/dist');
  if (existsSync(frontendDist)) {
    await fastify.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      decorateReply: true,
      // Disable the plugin's own Cache-Control so the values set below are not
      // overwritten when it re-applies its default headers.
      cacheControl: false,
      setHeaders(response, pathName) {
        if (isAlwaysRevalidated(pathName)) {
          // The entry point and the service worker must never be pinned by the
          // browser HTTP cache, otherwise a redeploy is never picked up.
          response.setHeader('cache-control', 'no-cache');
        } else if (pathName.includes('/assets/')) {
          // Vite fingerprints these filenames, so they can be cached forever.
          response.setHeader(
            'cache-control',
            'public, max-age=31536000, immutable',
          );
        } else {
          response.setHeader('cache-control', 'public, max-age=3600');
        }
      },
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api/')) {
        return reply.header('cache-control', 'no-cache').sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  return fastify;
}

/**
 * Whether a static file must always be revalidated by the browser (never
 * served from a stale HTTP cache): the app shell, the service worker and the
 * web manifest.
 * @param pathName - The absolute path of the file being served.
 * @returns `true` when the file must carry a `no-cache` header.
 */
function isAlwaysRevalidated(pathName: string): boolean {
  return (
    pathName.endsWith('index.html') ||
    pathName.endsWith('sw.js') ||
    pathName.endsWith('.webmanifest')
  );
}

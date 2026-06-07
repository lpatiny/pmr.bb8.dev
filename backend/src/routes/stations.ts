import { Type } from '@sinclair/typebox';

import { getAllStations } from '../stations.ts';
import type { FastifyTyped } from '../types.ts';

const StationSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  standardname: Type.String(),
  place: Type.String(),
});

/**
 * Register the stations route, returning the full list of stations.
 * @param fastify - The Fastify instance to register the route on.
 */
export default async function stationRoutes(fastify: FastifyTyped) {
  fastify.get(
    '/api/v1/stations',
    {
      schema: {
        tags: ['stations'],
        summary: 'List every known railway station',
        response: {
          200: Type.Array(StationSchema),
        },
      },
    },
    async () => getAllStations(),
  );
}

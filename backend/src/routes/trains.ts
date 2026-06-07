import { Type } from '@sinclair/typebox';

import { getAccessibleTrains } from '../bikeontrain.ts';
import type { Direction } from '../stations.ts';
import { DIRECTIONS } from '../stations.ts';
import type { FastifyTyped } from '../types.ts';

const TrainSchema = Type.Object({
  trainType: Type.String(),
  trainNumber: Type.String(),
  headsign: Type.String(),
  departureTime: Type.String(),
  arrivalTime: Type.String(),
  departureTimestamp: Type.Number(),
  durationMinutes: Type.Number(),
  departurePlatform: Type.Union([Type.String(), Type.Null()]),
  arrivalPlatform: Type.Union([Type.String(), Type.Null()]),
  bikeSpaces: Type.Union([Type.Number(), Type.Null()]),
  hasPrmSection: Type.Boolean(),
  hasPrmToilets: Type.Boolean(),
});

/**
 * Register the accessible-trains route.
 * @param fastify - The Fastify instance to register the route on.
 */
export default async function trainRoutes(fastify: FastifyTyped) {
  fastify.get(
    '/api/v1/trains/:direction',
    {
      schema: {
        tags: ['trains'],
        summary:
          'List upcoming PMR/bike-accessible direct trains for a direction',
        params: Type.Object({
          direction: Type.Union(DIRECTIONS.map((value) => Type.Literal(value))),
        }),
        response: {
          200: Type.Object({
            direction: Type.String(),
            trains: Type.Array(TrainSchema),
          }),
          502: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { direction } = request.params as { direction: Direction };
      try {
        const trains = await getAccessibleTrains(direction);
        return { direction, trains };
      } catch (error) {
        request.log.error(error);
        return reply
          .code(502)
          .send({ error: 'Impossible de contacter le service SNCB.' });
      }
    },
  );
}

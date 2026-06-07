import { Type } from '@sinclair/typebox';

import { getAccessibleTrains } from '../bikeontrain.ts';
import { getStation } from '../stations.ts';
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
    '/api/v1/trains',
    {
      schema: {
        tags: ['trains'],
        summary:
          'List upcoming PMR/bike-accessible direct trains between two stations',
        querystring: Type.Object({
          from: Type.String({ description: 'Origin station id' }),
          to: Type.String({ description: 'Destination station id' }),
          date: Type.Optional(
            Type.String({ description: 'Travel date, YYYY-MM-DD' }),
          ),
        }),
        response: {
          200: Type.Object({
            from: Type.String(),
            to: Type.String(),
            date: Type.Union([Type.String(), Type.Null()]),
            trains: Type.Array(TrainSchema),
          }),
          400: Type.Object({ error: Type.String() }),
          502: Type.Object({ error: Type.String() }),
        },
      },
    },
    async (request, reply) => {
      const { from, to, date } = request.query;

      const fromStation = getStation(from);
      const toStation = getStation(to);
      if (!fromStation || !toStation) {
        return reply.code(400).send({ error: 'Gare inconnue.' });
      }
      if (fromStation.id === toStation.id) {
        return reply
          .code(400)
          .send({ error: 'Choisissez deux gares différentes.' });
      }

      try {
        const trains = await getAccessibleTrains({
          from: fromStation,
          to: toStation,
          date,
        });
        return { from, to, date: date ?? null, trains };
      } catch (error) {
        request.log.error(error);
        return reply
          .code(502)
          .send({ error: 'Impossible de contacter le service SNCB.' });
      }
    },
  );
}

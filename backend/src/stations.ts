/** A station as expected by the SNCB BikeOnTrain search endpoint. */
export interface Station {
  /** Display name used by the endpoint (French). */
  name: string;
  /** `lon,lat` coordinate string used by the endpoint. */
  place: string;
  /** Numeric SNCB station id. */
  id: string;
}

/** The two travel directions supported by the application. */
export type Direction = 'oostende-bruges' | 'bruges-oostende';

/** Every supported direction, used to register routes and validate input. */
export const DIRECTIONS: Direction[] = ['oostende-bruges', 'bruges-oostende'];

const OOSTENDE: Station = {
  name: 'Ostende',
  place: '2.92581,51.22821',
  id: '8891702',
};

const BRUGES: Station = {
  name: 'Bruges',
  place: '3.21673,51.19723',
  id: '8891009',
};

/**
 * Resolve the origin and destination stations for a travel direction.
 * @param direction - The requested travel direction.
 * @returns The origin (`from`) and destination (`to`) stations.
 */
export function getStations(direction: Direction): {
  from: Station;
  to: Station;
} {
  return direction === 'oostende-bruges'
    ? { from: OOSTENDE, to: BRUGES }
    : { from: BRUGES, to: OOSTENDE };
}

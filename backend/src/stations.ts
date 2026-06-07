import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A Belgian railway station, as expected by the SNCB BikeOnTrain endpoint. */
export interface Station {
  /** Numeric SNCB station id, e.g. `8891702`. */
  id: string;
  /** Localized (French) display name, e.g. `Ostende`. */
  name: string;
  /** Default (Dutch/local) name, useful for searching, e.g. `Oostende`. */
  standardname: string;
  /** `lon,lat` coordinate string used by the endpoint. */
  place: string;
}

const allStations: Station[] = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/stations.json'), 'utf8'),
);

const stationById = new Map(
  allStations.map((station) => [station.id, station]),
);

/** Default origin: Ostende. */
export const DEFAULT_FROM_ID = '8891702';

/** Default destination: Bruges. */
export const DEFAULT_TO_ID = '8891009';

/**
 * Get every known station, sorted by their standard name.
 * @returns The full list of stations.
 */
export function getAllStations(): Station[] {
  return allStations;
}

/**
 * Look up a station by its numeric SNCB id.
 * @param id - The numeric station id.
 * @returns The station, or `undefined` when the id is unknown.
 */
export function getStation(id: string): Station | undefined {
  return stationById.get(id);
}

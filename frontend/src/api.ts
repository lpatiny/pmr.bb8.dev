/** A railway station offered in the selectors. */
export interface Station {
  id: string;
  name: string;
  standardname: string;
  place: string;
}

/** A single PMR/bike-accessible direct train returned by the backend. */
export interface AccessibleTrain {
  trainType: string;
  trainNumber: string;
  headsign: string;
  departureTime: string;
  arrivalTime: string;
  departureTimestamp: number;
  durationMinutes: number;
  departurePlatform: string | null;
  arrivalPlatform: string | null;
  bikeSpaces: number | null;
  hasPrmSection: boolean;
  hasPrmToilets: boolean;
}

/**
 * Fetch the full list of stations from the backend.
 * @returns Every station, sorted by name.
 */
export async function fetchStations(): Promise<Station[]> {
  const response = await fetch('/api/v1/stations');
  if (!response.ok) {
    throw new Error('Impossible de charger la liste des gares.');
  }
  return (await response.json()) as Station[];
}

/** Parameters for {@link fetchDayTrains}. */
export interface DayTrainsQuery {
  /** Origin station id. */
  from: string;
  /** Destination station id. */
  to: string;
  /** Travel date `YYYY-MM-DD`. */
  date: string;
}

/**
 * Fetch every accessible direct train for a whole day between two stations.
 * The full day is returned so the client can page through it offline without
 * any further request.
 * @param params - The origin, destination and travel date.
 * @returns Every accessible direct train of that day, soonest first.
 */
export async function fetchDayTrains(
  params: DayTrainsQuery,
): Promise<AccessibleTrain[]> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    date: params.date,
    full: 'true',
  });

  const response = await fetch(`/api/v1/trains?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Le service est momentanément indisponible.');
  }
  const body = (await response.json()) as { trains: AccessibleTrain[] };
  return body.trains;
}

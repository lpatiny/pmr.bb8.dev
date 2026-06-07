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

/** Parameters for {@link fetchAccessibleTrains}. */
export interface AccessibleTrainsQuery {
  /** Origin station id. */
  from: string;
  /** Destination station id. */
  to: string;
  /** Travel date `YYYY-MM-DD`. */
  date?: string;
  /** Departure hour `00`–`23`; empty means "from now". */
  hour?: string;
  /** Return trains departing after this timestamp (ms) — for "later". */
  after?: number;
  /** Return trains departing before this timestamp (ms) — for "earlier". */
  before?: number;
}

/**
 * Fetch accessible trains between two stations for the given search window.
 * @param params - The origin, destination and optional date/hour/after/before.
 * @returns The accessible direct trains, soonest first.
 */
export async function fetchAccessibleTrains(
  params: AccessibleTrainsQuery,
): Promise<AccessibleTrain[]> {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  if (params.date) query.set('date', params.date);
  if (params.hour) query.set('hour', params.hour);
  if (params.after !== undefined) query.set('after', String(params.after));
  if (params.before !== undefined) query.set('before', String(params.before));

  const response = await fetch(`/api/v1/trains?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Le service est momentanément indisponible.');
  }
  const body = (await response.json()) as { trains: AccessibleTrain[] };
  return body.trains;
}

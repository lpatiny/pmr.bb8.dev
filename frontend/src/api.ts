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

/**
 * Fetch the upcoming accessible trains between two stations on a given date.
 * @param params - The origin id, destination id and travel date (YYYY-MM-DD).
 * @returns The accessible direct trains, soonest first.
 */
export async function fetchAccessibleTrains(params: {
  from: string;
  to: string;
  date: string;
}): Promise<AccessibleTrain[]> {
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/v1/trains?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Le service est momentanément indisponible.');
  }
  const body = (await response.json()) as { trains: AccessibleTrain[] };
  return body.trains;
}

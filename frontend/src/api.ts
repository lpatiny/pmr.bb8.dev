/** The two travel directions supported by the application. */
export type Direction = 'oostende-bruges' | 'bruges-oostende';

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
 * Fetch the upcoming accessible trains for a direction from the backend.
 * @param direction - The requested travel direction.
 * @returns The accessible direct trains, soonest first.
 */
export async function fetchAccessibleTrains(
  direction: Direction,
): Promise<AccessibleTrain[]> {
  const response = await fetch(`/api/v1/trains/${direction}`);
  if (!response.ok) {
    throw new Error('Le service est momentanément indisponible.');
  }
  const body = (await response.json()) as { trains: AccessibleTrain[] };
  return body.trains;
}

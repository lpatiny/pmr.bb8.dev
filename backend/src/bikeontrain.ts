import type { RawResponse, SearchWindow } from './bikeontrainClient.ts';
import {
  fetchSearch,
  latestDepartureTimestamp,
  toSearchWindow,
} from './bikeontrainClient.ts';
import type { Station } from './stations.ts';

/**
 * A single fully-accessible (PMR / bike) direct train, as returned by the API.
 */
export interface AccessibleTrain {
  /** Train type, e.g. `IC`. */
  trainType: string;
  /** Commercial train number, e.g. `1808`. */
  trainNumber: string;
  /** Final destination of the train (its headsign). */
  headsign: string;
  /** Departure time in `HH:MM` (local Belgian time). */
  departureTime: string;
  /** Arrival time in `HH:MM` (local Belgian time). */
  arrivalTime: string;
  /** Departure timestamp in milliseconds since the epoch, used for sorting. */
  departureTimestamp: number;
  /** Trip duration in minutes. */
  durationMinutes: number;
  /** Departure platform, or `null` when unknown. */
  departurePlatform: string | null;
  /** Arrival platform, or `null` when unknown. */
  arrivalPlatform: string | null;
  /** Number of bike spaces on board, or `null` when unknown. */
  bikeSpaces: number | null;
  /** Whether the train has a dedicated wheelchair (PMR) section. */
  hasPrmSection: boolean;
  /** Whether the train has accessible (PMR) toilets. */
  hasPrmToilets: boolean;
}

/**
 * Accessibility score that the SNCB website paints green ("low difficulty").
 * Scores 3, 2 and 1 are painted orange/red and are filtered out.
 */
const GREEN_SCORE = 4;

/** How many accessible trains to return by default. */
const DEFAULT_LIMIT = 10;

/** Safety cap on upstream requests for a single call. */
const MAX_PAGES = 12;

/** How far back to look when collecting earlier trains, in milliseconds. */
const LOOKBACK_MS = 6 * 60 * 60 * 1000;

/** Options for {@link getAccessibleTrains}. */
export interface AccessibleTrainsOptions {
  /** The origin station. */
  from: Station;
  /** The destination station. */
  to: Station;
  /**
   * The travel date in `YYYY-MM-DD` (Belgian local time). When omitted or set
   * to today (with no `hour`), the search starts from the current time.
   */
  date?: string;
  /** The departure hour `00`–`23`. When omitted, starts at midnight (or now). */
  hour?: string;
  /** Return trains departing strictly after this timestamp (for "later"). */
  after?: number;
  /** Return the latest trains departing strictly before this timestamp. */
  before?: number;
  /** Maximum number of trains to return. Defaults to `10`. */
  limit?: number;
}

/**
 * Fetch accessible direct trains between two stations. The SNCB endpoint only
 * returns about one hour of results per request, so this pages forward in time
 * until enough trains are collected. Use `after` / `before` to extend an
 * existing list with later / earlier trains.
 * @param options - The origin, destination and search window.
 * @returns The green (PMR/bike-accessible) direct trains, soonest first.
 */
export async function getAccessibleTrains(
  options: AccessibleTrainsOptions,
): Promise<AccessibleTrain[]> {
  const {
    from,
    to,
    date,
    hour,
    after,
    before,
    limit = DEFAULT_LIMIT,
  } = options;

  if (before !== undefined) {
    const trains = await collectForward(
      from,
      to,
      toSearchWindow(before - LOOKBACK_MS),
      {
        until: before,
      },
    );
    return trains
      .filter((train) => train.departureTimestamp < before)
      .slice(-limit);
  }

  const start =
    after !== undefined
      ? toSearchWindow(after + 60_000)
      : initialWindow(date, hour);
  const trains = await collectForward(from, to, start, { limit });
  return (
    after !== undefined
      ? trains.filter((train) => train.departureTimestamp > after)
      : trains
  ).slice(0, limit);
}

/**
 * Page forward from a window, accumulating accessible trains until the limit
 * is reached, the upper bound is passed, or the window stops advancing.
 * @param from - The origin station.
 * @param to - The destination station.
 * @param startWindow - The first window (undefined means "now").
 * @param bounds - Optional `limit` of trains and `until` timestamp upper bound.
 * @returns The collected trains, sorted by departure time.
 */
async function collectForward(
  from: Station,
  to: Station,
  startWindow: SearchWindow | undefined,
  bounds: { limit?: number; until?: number },
): Promise<AccessibleTrain[]> {
  const { limit, until } = bounds;
  const collected = new Map<string, AccessibleTrain>();
  let window = startWindow;
  let previousLastTimestamp = Number.NEGATIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (limit !== undefined && collected.size >= limit) break;

    // eslint-disable-next-line no-await-in-loop -- sequential pagination of a remote API
    const raw = await fetchSearch(from, to, window);
    for (const train of parseAccessibleTrains(raw)) {
      collected.set(`${train.trainNumber}-${train.departureTimestamp}`, train);
    }

    const lastTimestamp = latestDepartureTimestamp(raw);
    // Stop once the window stops advancing, otherwise we would loop forever.
    if (lastTimestamp === null || lastTimestamp <= previousLastTimestamp) break;
    if (until !== undefined && lastTimestamp >= until) break;
    previousLastTimestamp = lastTimestamp;
    window = toSearchWindow(lastTimestamp + 60_000);
  }

  return [...collected.values()].toSorted(
    (a, b) => a.departureTimestamp - b.departureTimestamp,
  );
}

/**
 * Extract the green (PMR/bike-accessible) direct trains from a raw BikeOnTrain
 * search response. Exported separately so it can be unit-tested with a fixture.
 * @param raw - The parsed JSON body returned by the search endpoint.
 * @returns The accessible direct trains found in this single page.
 */
export function parseAccessibleTrains(raw: unknown): AccessibleTrain[] {
  const itineraries = (raw as RawResponse | null)?.hacon?.itineraries ?? [];

  const trains: AccessibleTrain[] = [];
  for (const itinerary of itineraries) {
    if (itinerary.isCancelled) continue;
    if (itinerary.itineraryScore !== GREEN_SCORE) continue;

    const transitLegs = itinerary.legs.filter((leg) => leg.transitLeg);
    // Keep direct trains only: a single train, no transfers.
    if (transitLegs.length !== 1) continue;

    const leg = transitLegs[0];
    if (!leg) continue;
    const accessibility = leg.accessibilityData?.trainAccessibility;

    trains.push({
      trainType: leg.route ?? leg.routeShortName ?? '',
      trainNumber: leg.tripShortName ?? '',
      headsign: leg.headsign ?? '',
      departureTime: leg.from.departureHr ?? '',
      arrivalTime: leg.to.arrivalHr ?? '',
      departureTimestamp: leg.startTime,
      durationMinutes: Math.round(itinerary.duration / 60),
      departurePlatform: leg.from.platformCode ?? null,
      arrivalPlatform: leg.to.platformCode ?? null,
      bikeSpaces: accessibility?.space ?? null,
      hasPrmSection: accessibility?.hasPrmSection ?? false,
      hasPrmToilets: accessibility?.hasPrmToilets ?? false,
    });
  }

  return trains;
}

/**
 * Build the first search window for a requested travel date and hour. Today
 * with no hour starts from the current time; otherwise it starts at the given
 * hour (or midnight).
 * @param date - The requested date in `YYYY-MM-DD`, or undefined.
 * @param hour - The requested hour `00`–`23`, or undefined.
 * @returns The initial window, or undefined to start from "now".
 */
function initialWindow(date?: string, hour?: string): SearchWindow | undefined {
  const paddedHour = hour ? hour.padStart(2, '0') : undefined;

  if (!date) {
    if (paddedHour === undefined) return undefined;
    return {
      date: toSearchWindow(Date.now()).date,
      hour: paddedHour,
      minute: '00',
    };
  }

  const today = toSearchWindow(Date.now()).date;
  if (date === today && paddedHour === undefined) return undefined;
  return { date, hour: paddedHour ?? '00', minute: '00' };
}

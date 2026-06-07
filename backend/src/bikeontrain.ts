import type { Direction, Station } from './stations.ts';
import { getStations } from './stations.ts';

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

/** Safety cap on upstream requests while paginating to reach the limit. */
const MAX_PAGES = 8;

const SEARCH_BASE = 'https://bikeontrain.belgiantrain.be/fr/search';
// Remix data-loader route id; returns the search results as JSON.
const DATA_ROUTE = 'routes/($locale).search._index';

/** A point in time, in Belgian local time, used to page through results. */
interface SearchWindow {
  date: string;
  hour: string;
  minute: string;
}

/**
 * Fetch the upcoming accessible direct trains for a direction. The SNCB
 * endpoint only returns about one hour of results per request, so this pages
 * forward in time (each page starting just after the previous page's last
 * departure) until `limit` accessible trains are collected.
 * @param direction - The requested travel direction.
 * @param limit - Maximum number of trains to return. Defaults to `10`.
 * @returns The green (PMR/bike-accessible) direct trains, soonest first.
 */
export async function getAccessibleTrains(
  direction: Direction,
  limit = DEFAULT_LIMIT,
): Promise<AccessibleTrain[]> {
  const { from, to } = getStations(direction);

  const collected = new Map<string, AccessibleTrain>();
  let window: SearchWindow | undefined;
  let previousLastTimestamp = Number.NEGATIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES && collected.size < limit; page++) {
    // eslint-disable-next-line no-await-in-loop -- sequential pagination of a remote API
    const raw = await fetchSearch(from, to, window);

    for (const train of parseAccessibleTrains(raw)) {
      collected.set(`${train.trainNumber}-${train.departureTimestamp}`, train);
    }

    const lastTimestamp = latestDepartureTimestamp(raw);
    // Stop once the window stops advancing, otherwise we would loop forever.
    if (lastTimestamp === null || lastTimestamp <= previousLastTimestamp) break;
    previousLastTimestamp = lastTimestamp;
    window = toSearchWindow(lastTimestamp + 60_000);
  }

  return [...collected.values()]
    .toSorted((a, b) => a.departureTimestamp - b.departureTimestamp)
    .slice(0, limit);
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
 * Fetch a single page of search results from the BikeOnTrain Remix loader.
 * @param from - The origin station.
 * @param to - The destination station.
 * @param window - The point in time to search from; omitted means "now".
 * @returns The parsed JSON body of the response.
 */
async function fetchSearch(
  from: Station,
  to: Station,
  window?: SearchWindow,
): Promise<unknown> {
  const params = new URLSearchParams({
    fromName: from.name,
    fromPlace: from.place,
    fromId: from.id,
    toName: to.name,
    toPlace: to.place,
    toId: to.id,
  });
  if (window) {
    params.set('arriveBy', 'false');
    params.set('date', window.date);
    params.set('hour', window.hour);
    params.set('minute', window.minute);
  }
  const url = `${SEARCH_BASE}?${params.toString()}&_data=${encodeURIComponent(DATA_ROUTE)}`;

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(
      `BikeOnTrain request failed with status ${response.status}`,
    );
  }
  return response.json();
}

/**
 * Find the latest departure timestamp in a page, across all itineraries
 * (not only the accessible ones), used to advance the search window.
 * @param raw - The parsed JSON body of a search response.
 * @returns The latest departure timestamp, or `null` when the page is empty.
 */
function latestDepartureTimestamp(raw: unknown): number | null {
  const itineraries = (raw as RawResponse | null)?.hacon?.itineraries ?? [];
  let latest: number | null = null;
  for (const itinerary of itineraries) {
    for (const leg of itinerary.legs) {
      if (leg.transitLeg && (latest === null || leg.startTime > latest)) {
        latest = leg.startTime;
      }
    }
  }
  return latest;
}

const BRUSSELS_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Convert a timestamp into a Belgian-local search window (date / hour / minute).
 * @param timestamp - Milliseconds since the epoch.
 * @returns The corresponding date, hour and minute in Europe/Brussels.
 */
function toSearchWindow(timestamp: number): SearchWindow {
  const parts = BRUSSELS_PARTS.formatToParts(new Date(timestamp));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
  };
}

interface RawResponse {
  hacon?: {
    itineraries?: RawItinerary[];
  };
}

interface RawItinerary {
  itineraryScore: number;
  isCancelled: boolean;
  duration: number;
  legs: RawLeg[];
}

interface RawLeg {
  transitLeg: boolean;
  route?: string;
  routeShortName?: string;
  tripShortName?: string;
  headsign?: string;
  startTime: number;
  from: RawStop;
  to: RawStop;
  accessibilityData?: {
    trainAccessibility?: {
      space?: number;
      hasPrmSection?: boolean;
      hasPrmToilets?: boolean;
    };
  };
}

interface RawStop {
  platformCode?: string;
  departureHr?: string;
  arrivalHr?: string;
}

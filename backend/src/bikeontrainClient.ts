import type { Station } from './stations.ts';

const SEARCH_BASE = 'https://bikeontrain.belgiantrain.be/fr/search';
// Remix data-loader route id; returns the search results as JSON.
const DATA_ROUTE = 'routes/($locale).search._index';

/** A point in time, in Belgian local time, used to page through results. */
export interface SearchWindow {
  date: string;
  hour: string;
  minute: string;
}

/**
 * Fetch a single page of search results from the BikeOnTrain Remix loader.
 * @param from - The origin station.
 * @param to - The destination station.
 * @param window - The point in time to search from; omitted means "now".
 * @returns The parsed JSON body of the response.
 */
export async function fetchSearch(
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
export function latestDepartureTimestamp(raw: unknown): number | null {
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
export function toSearchWindow(timestamp: number): SearchWindow {
  const parts = BRUSSELS_PARTS.formatToParts(new Date(timestamp));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
  };
}

export interface RawResponse {
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

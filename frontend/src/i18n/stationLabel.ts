import type { Station } from '../api.ts';

/**
 * The station name to display in the current language. Belgian stations carry a
 * French `name` (e.g. `Ostende`) and a Dutch/local `standardname` (e.g.
 * `Oostende`); Dutch uses the latter, every other language the former.
 * @param station - The station to label.
 * @param language - The active UI language code.
 * @returns The localized station name.
 */
export function stationLabel(station: Station, language: string): string {
  return language === 'nl' ? station.standardname : station.name;
}

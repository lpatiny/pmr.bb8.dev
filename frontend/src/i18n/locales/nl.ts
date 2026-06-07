import type { fr } from './fr.ts';

/** Dutch translations, typed against the French locale so keys stay in sync. */
export const nl: typeof fr = {
  app: {
    title: 'Treinen PBM',
    documentTitle: 'Toegankelijke treinen — Oostende ↔ Brugge',
    sameStation: 'Kies twee verschillende stations.',
  },
  language: {
    label: 'Taal',
  },
  search: {
    from: 'Van',
    to: 'Naar',
    swap: 'Stations omwisselen',
    date: 'Datum',
    today: 'Vandaag',
    tomorrow: 'Morgen',
    otherDate: 'Andere datum',
    departureTime: 'Vertrekuur',
    asSoon: 'Zo snel mogelijk',
    chooseTime: 'Uur kiezen',
    hour: '{{value}} u',
  },
  station: {
    placeholder: 'Typ de naam van een station…',
  },
  train: {
    platform: 'Spoor {{platform}}',
    accessible: '♿ Toegankelijk',
    bikeSpaces: '🚲 {{spaces}} plaatsen',
    duration: '{{minutes}} min',
  },
  list: {
    loading: 'Treinen zoeken…',
    unavailable: 'De dienst is tijdelijk niet beschikbaar.',
    retry: 'Opnieuw proberen',
    empty: 'Er zijn momenteel geen toegankelijke treinen gepland.',
    earlier: '↑ Vroegere treinen',
    later: '↓ Latere treinen',
  },
  sync: {
    syncing: 'Bijwerken…',
    synced: 'Dienstregeling up-to-date',
    offline: 'Offline',
    counts: '{{today}} vandaag / {{tomorrow}} morgen',
  },
  install: {
    button: 'App installeren',
    iosHint:
      'Om de app op uw telefoon te bewaren: tik op <1>Deel</1><2> ⎋ </2> en daarna <3>« Zet op beginscherm »</3>.',
    close: 'Sluiten',
  },
  errors: {
    stations: 'De lijst met stations kan niet worden geladen.',
    service: 'De dienst is tijdelijk niet beschikbaar.',
  },
};

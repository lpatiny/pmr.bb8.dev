/** French translations. This object is the canonical shape every locale must match. */
export const fr = {
  app: {
    title: 'Trains PMR',
    documentTitle: 'Trains accessibles — Ostende ↔ Bruges',
    sameStation: 'Choisissez deux gares différentes.',
  },
  language: {
    label: 'Langue',
  },
  search: {
    from: 'De',
    to: 'Vers',
    swap: 'Inverser les gares',
    date: 'Date',
    today: 'Aujourd’hui',
    tomorrow: 'Demain',
    otherDate: 'Autre date',
    departureTime: 'Heure de départ',
    asSoon: 'Dès que possible',
    chooseTime: 'Choisir l’heure',
    hour: '{{value}} h',
  },
  station: {
    placeholder: 'Taper le nom d’une gare…',
  },
  train: {
    platform: 'Voie {{platform}}',
    accessible: '♿ Accessible',
    bikeSpaces: '🚲 {{spaces}} places',
    duration: '{{minutes}} min',
    cancelled: '⛔ Supprimé',
    delayed: '+{{minutes}} min',
  },
  list: {
    loading: 'Recherche des trains…',
    unavailable: 'Le service est momentanément indisponible.',
    retry: 'Réessayer',
    empty: 'Aucun train accessible n’est prévu pour le moment.',
    earlier: '↑ Trains plus tôt',
    later: '↓ Trains plus tard',
  },
  sync: {
    syncing: 'Mise à jour…',
    synced: 'Horaires à jour',
    offline: 'Hors ligne',
    counts: '{{today}} aujourd’hui / {{tomorrow}} demain',
    refresh: 'Actualiser les horaires',
  },
  install: {
    button: 'Installer l’application',
    iosHint:
      'Pour garder l’application sur votre téléphone : appuyez sur <1>Partager</1><2> ⎋ </2> puis <3>« Sur l’écran d’accueil »</3>.',
    close: 'Fermer',
  },
  errors: {
    stations: 'Impossible de charger la liste des gares.',
    service: 'Le service est momentanément indisponible.',
  },
};

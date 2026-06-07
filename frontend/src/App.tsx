import { useEffect, useState } from 'react';

import type { AccessibleTrain, Station } from './api.ts';
import { fetchAccessibleTrains, fetchStations } from './api.ts';
import { SearchControls } from './pages/home/components/SearchControls.tsx';
import { TrainList } from './pages/home/components/TrainList.tsx';
import { todayInBrussels } from './pages/home/dates.ts';

const DEFAULT_FROM = '8891702'; // Ostende
const DEFAULT_TO = '8891009'; // Bruges

function mergeTrains(
  a: AccessibleTrain[],
  b: AccessibleTrain[],
): AccessibleTrain[] {
  const byKey = new Map<string, AccessibleTrain>();
  for (const train of [...a, ...b]) {
    byKey.set(`${train.trainNumber}-${train.departureTimestamp}`, train);
  }
  return [...byKey.values()].toSorted(
    (x, y) => x.departureTimestamp - y.departureTimestamp,
  );
}

export function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [date, setDate] = useState(todayInBrussels());
  const [hour, setHour] = useState('');

  const [trains, setTrains] = useState<AccessibleTrain[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [extending, setExtending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    fetchStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  useEffect(() => {
    if (from === to) return;

    let cancelled = false;
    async function load() {
      try {
        const result = await fetchAccessibleTrains({ from, to, date, hour });
        if (!cancelled) {
          setTrains(result);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [from, to, date, hour, reloadToken]);

  function update(next: {
    from?: string;
    to?: string;
    date?: string;
    hour?: string;
  }) {
    setStatus('loading');
    setTrains([]);
    if (next.from !== undefined) setFrom(next.from);
    if (next.to !== undefined) setTo(next.to);
    if (next.date !== undefined) setDate(next.date);
    if (next.hour !== undefined) setHour(next.hour);
  }

  async function extend(edge: 'earlier' | 'later') {
    const anchor = edge === 'earlier' ? trains[0] : trains.at(-1);
    if (!anchor || extending) return;
    setExtending(true);
    try {
      const more = await fetchAccessibleTrains(
        edge === 'earlier'
          ? { from, to, before: anchor.departureTimestamp }
          : { from, to, after: anchor.departureTimestamp },
      );
      setTrains((current) => mergeTrains(current, more));
    } finally {
      setExtending(false);
    }
  }

  return (
    <main className="app">
      <h1 className="app-title">Trains accessibles (PMR)</h1>

      <SearchControls
        stations={stations}
        from={from}
        to={to}
        date={date}
        hour={hour}
        onFromChange={(value) => update({ from: value })}
        onToChange={(value) => update({ to: value })}
        onDateChange={(value) => update({ date: value })}
        onHourChange={(value) => update({ hour: value })}
        onSwap={() => update({ from: to, to: from })}
      />

      {from === to ? (
        <p className="state-message">Choisissez deux gares différentes.</p>
      ) : (
        <TrainList
          status={status}
          trains={trains}
          extending={extending}
          onRetry={() => {
            setStatus('loading');
            setReloadToken((token) => token + 1);
          }}
          onEarlier={() => void extend('earlier')}
          onLater={() => void extend('later')}
        />
      )}
    </main>
  );
}

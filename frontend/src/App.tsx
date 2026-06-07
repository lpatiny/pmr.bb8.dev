import { useEffect, useState } from 'react';

import type { AccessibleTrain, Station } from './api.ts';
import { fetchAccessibleTrains, fetchStations } from './api.ts';
import { SearchControls } from './pages/home/components/SearchControls.tsx';
import { TrainList } from './pages/home/components/TrainList.tsx';

const REFRESH_INTERVAL_MS = 60_000;
const DEFAULT_FROM = '8891702'; // Ostende
const DEFAULT_TO = '8891009'; // Bruges

function todayInBrussels(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
  }).format(new Date());
}

export function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [date, setDate] = useState(todayInBrussels());

  const [trains, setTrains] = useState<AccessibleTrain[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    fetchStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  useEffect(() => {
    // The list is hidden while from === to (see the render guard below),
    // so there is nothing to fetch and no state to update here.
    if (from === to) return;

    let cancelled = false;
    async function load() {
      try {
        const result = await fetchAccessibleTrains({ from, to, date });
        if (!cancelled) {
          setTrains(result);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void load();
    const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [from, to, date, reloadToken]);

  function update(next: { from?: string; to?: string; date?: string }) {
    setStatus('loading');
    setTrains([]);
    if (next.from !== undefined) setFrom(next.from);
    if (next.to !== undefined) setTo(next.to);
    if (next.date !== undefined) setDate(next.date);
  }

  function swap() {
    update({ from: to, to: from });
  }

  return (
    <main className="app">
      <h1 className="app-title">Trains accessibles (PMR)</h1>

      <SearchControls
        stations={stations}
        from={from}
        to={to}
        date={date}
        onFromChange={(value) => update({ from: value })}
        onToChange={(value) => update({ to: value })}
        onDateChange={(value) => update({ date: value })}
        onSwap={swap}
      />

      {from === to ? (
        <p className="state-message">Choisissez deux gares différentes.</p>
      ) : (
        <TrainList
          status={status}
          trains={trains}
          onRetry={() => {
            setStatus('loading');
            setReloadToken((token) => token + 1);
          }}
        />
      )}
    </main>
  );
}

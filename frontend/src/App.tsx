import { useEffect, useState } from 'react';

import type { AccessibleTrain, Direction } from './api.ts';
import { fetchAccessibleTrains } from './api.ts';
import { DirectionTabs } from './pages/home/components/DirectionTabs.tsx';
import { TrainList } from './pages/home/components/TrainList.tsx';

const REFRESH_INTERVAL_MS = 60_000;

export function App() {
  const [direction, setDirection] = useState<Direction>('oostende-bruges');
  const [trains, setTrains] = useState<AccessibleTrain[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchAccessibleTrains(direction);
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
  }, [direction, reloadToken]);

  function changeDirection(next: Direction) {
    if (next === direction) return;
    setStatus('loading');
    setTrains([]);
    setDirection(next);
  }

  function retry() {
    setStatus('loading');
    setReloadToken((token) => token + 1);
  }

  return (
    <main className="app">
      <h1 className="app-title">Trains accessible (PMR)</h1>

      <DirectionTabs direction={direction} onChange={changeDirection} />

      <TrainList status={status} trains={trains} onRetry={retry} />
    </main>
  );
}

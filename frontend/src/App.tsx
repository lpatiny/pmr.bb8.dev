import { useEffect, useRef, useState } from 'react';

import type { AccessibleTrain, Station } from './api.ts';
import { fetchDayTrains, fetchStations } from './api.ts';
import { InstallHint } from './pages/home/components/InstallHint.tsx';
import { SearchControls } from './pages/home/components/SearchControls.tsx';
import type { SyncState } from './pages/home/components/SyncStatus.tsx';
import { SyncStatus } from './pages/home/components/SyncStatus.tsx';
import { TrainList } from './pages/home/components/TrainList.tsx';
import { todayInBrussels } from './pages/home/dates.ts';
import type { WarmOptions } from './pages/home/offline.ts';
import { warmOfflineCache } from './pages/home/offline.ts';
import { PAGE_SIZE, anchorIndex } from './pages/home/timetable.ts';

const DEFAULT_FROM = '8891702'; // Ostende
const DEFAULT_TO = '8891009'; // Bruges

/** Don't re-fetch the day on focus more often than this (it is heavy). */
const REFRESH_THROTTLE_MS = 60_000;

export function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [date, setDate] = useState(todayInBrussels());
  const [hour, setHour] = useState('');

  const [dayTrains, setDayTrains] = useState<AccessibleTrain[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [sync, setSync] = useState<SyncState>('syncing');
  const [counts, setCounts] = useState<{
    today: number;
    tomorrow: number;
  } | null>(null);

  // How many "earlier"/"later" steps the user paged from the anchor. Reset
  // whenever the loaded day or the anchor inputs change (see render below).
  const [steps, setSteps] = useState({ earlier: 0, later: 0 });
  const [windowKey, setWindowKey] = useState('');

  const lastSyncKey = useRef('');
  const lastLoadAt = useRef(0);

  useEffect(() => {
    fetchStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  useEffect(() => {
    if (from === to) return;
    let cancelled = false;

    async function loadThenSync() {
      // 1) Show the whole selected day first — from the network, or instantly
      // from the service-worker cache when offline.
      let preloaded: WarmOptions['preloaded'];
      try {
        const trains = await fetchDayTrains({ from, to, date });
        if (cancelled) return;
        lastLoadAt.current = Date.now();
        setDayTrains(trains);
        setStatus('ready');
        preloaded = { from, to, date, trains };
      } catch {
        if (!cancelled) setStatus('error');
      }

      // 2) Then warm today + tomorrow (both directions) for offline paging —
      // once per direction change / refresh, reusing the view just loaded.
      if (cancelled) return;
      const key = `${from}|${to}|${reloadToken}`;
      if (key === lastSyncKey.current) return;
      lastSyncKey.current = key;

      setSync('syncing');
      const outcome = await warmOfflineCache(from, to, { preloaded });
      if (cancelled) return;
      setSync(outcome.ok ? 'synced' : 'offline');
      if (outcome.ok) {
        setCounts({ today: outcome.today, tomorrow: outcome.tomorrow });
      }
    }

    void loadThenSync();
    return () => {
      cancelled = true;
    };
  }, [from, to, date, reloadToken]);

  useEffect(() => {
    // Refresh on focus / reconnection so a home-screen app reopens up to date,
    // throttled so a quick app switch does not re-fetch the whole day.
    function maybeRefresh() {
      if (Date.now() - lastLoadAt.current > REFRESH_THROTTLE_MS) {
        setReloadToken((token) => token + 1);
      }
    }
    function onReconnect() {
      setReloadToken((token) => token + 1);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') maybeRefresh();
    }
    function onOffline() {
      setSync('offline');
    }
    window.addEventListener('online', onReconnect);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', maybeRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onReconnect);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', maybeRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  function selectTrip(next: { from?: string; to?: string; date?: string }) {
    setStatus('loading');
    setDayTrains([]);
    if (next.from !== undefined) setFrom(next.from);
    if (next.to !== undefined) setTo(next.to);
    if (next.date !== undefined) setDate(next.date);
  }

  // Reset the visible window when the loaded day or the anchor inputs change.
  const currentWindowKey = `${from}|${to}|${date}|${hour}|${dayTrains.length}`;
  if (currentWindowKey !== windowKey) {
    setWindowKey(currentWindowKey);
    setSteps({ earlier: 0, later: 0 });
  }

  const anchor = anchorIndex(dayTrains, date, hour);
  const start = Math.max(0, anchor - steps.earlier * PAGE_SIZE);
  const end = Math.min(
    dayTrains.length,
    anchor + PAGE_SIZE + steps.later * PAGE_SIZE,
  );
  const visible = dayTrains.slice(start, end);

  return (
    <main className="app">
      <h1 className="app-title">Trains accessibles (PMR)</h1>

      {from !== to && <SyncStatus state={sync} counts={counts} />}

      <InstallHint />

      <SearchControls
        stations={stations}
        from={from}
        to={to}
        date={date}
        hour={hour}
        onFromChange={(value) => selectTrip({ from: value })}
        onToChange={(value) => selectTrip({ to: value })}
        onDateChange={(value) => selectTrip({ date: value })}
        onHourChange={setHour}
        onSwap={() => selectTrip({ from: to, to: from })}
      />

      {from === to ? (
        <p className="state-message">Choisissez deux gares différentes.</p>
      ) : (
        <TrainList
          status={status}
          trains={visible}
          canEarlier={start > 0}
          canLater={end < dayTrains.length}
          onRetry={() => {
            setStatus('loading');
            setReloadToken((token) => token + 1);
          }}
          onEarlier={() =>
            setSteps((current) => ({
              ...current,
              earlier: current.earlier + 1,
            }))
          }
          onLater={() =>
            setSteps((current) => ({ ...current, later: current.later + 1 }))
          }
        />
      )}
    </main>
  );
}

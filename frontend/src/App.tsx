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
import { FRESH_FOR_MS, warmOfflineCache } from './pages/home/offline.ts';
import { loadStoredDay, storeDay, storedDayAge } from './pages/home/storage.ts';
import { PAGE_SIZE, anchorIndex } from './pages/home/timetable.ts';

const DEFAULT_FROM = '8891702'; // Ostende
const DEFAULT_TO = '8891009'; // Bruges
const INITIAL_DATE = todayInBrussels();
const INITIAL_STORED = loadStoredDay(DEFAULT_FROM, DEFAULT_TO, INITIAL_DATE);

export function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [date, setDate] = useState(INITIAL_DATE);
  const [hour, setHour] = useState('');

  // Hydrate instantly from localStorage so the timetable shows at once, even
  // offline, before the (slow) network refresh completes.
  const [dayTrains, setDayTrains] = useState<AccessibleTrain[]>(
    INITIAL_STORED ?? [],
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    INITIAL_STORED ? 'ready' : 'loading',
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [sync, setSync] = useState<SyncState>('syncing');
  const [counts, setCounts] = useState<{
    today: number;
    tomorrow: number;
  } | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // How many "earlier"/"later" steps the user paged from the anchor. Reset
  // whenever the loaded day or the anchor inputs change (see render below).
  const [steps, setSteps] = useState({ earlier: 0, later: 0 });
  const [windowKey, setWindowKey] = useState('');

  const lastSyncKey = useRef('');

  useEffect(() => {
    fetchStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  useEffect(() => {
    if (from === to) return;
    let cancelled = false;

    async function loadThenSync() {
      // 1) When the stored day is still fresh, use it as-is (even online) — no
      // network. Otherwise refresh it and persist; the view already shows the
      // stored copy, so a failure offline just keeps it instead of erroring.
      const stored = loadStoredDay(from, to, date);
      const age = storedDayAge(from, to, date);
      let preloaded: WarmOptions['preloaded'];

      if (stored && age !== null && age < FRESH_FOR_MS) {
        if (cancelled) return;
        setDayTrains(stored);
        setStatus('ready');
      } else {
        try {
          const trains = await fetchDayTrains({ from, to, date });
          if (cancelled) return;
          storeDay(from, to, date, trains);
          setDayTrains(trains);
          setStatus('ready');
          preloaded = { from, to, date, trains };
        } catch {
          if (!cancelled && !stored) setStatus('error');
        }
      }

      // 2) Then warm today + tomorrow (both directions) for offline paging —
      // once per direction change / refresh, reusing the view just loaded.
      if (cancelled) return;
      const key = `${from}|${to}|${reloadToken}`;
      if (key === lastSyncKey.current) return;
      lastSyncKey.current = key;

      setSync('syncing');
      setProgress(null);
      const outcome = await warmOfflineCache(from, to, {
        preloaded,
        onProgress: (done, total) => {
          if (!cancelled) setProgress({ done, total });
        },
      });
      if (cancelled) return;
      setProgress(null);
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
    // Refresh on focus / reconnection so a home-screen app reopens up to date.
    // The load effect only hits the network when the stored day is stale, so
    // this is cheap when everything is still fresh.
    function refresh() {
      setReloadToken((token) => token + 1);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }
    function onOffline() {
      setSync('offline');
    }
    window.addEventListener('online', refresh);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  function selectTrip(next: { from?: string; to?: string; date?: string }) {
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    const nextDate = next.date ?? date;

    // Show the stored timetable for the new selection at once (or a loading
    // state when nothing is stored yet); the effect then refreshes it.
    const stored =
      nextFrom === nextTo ? null : loadStoredDay(nextFrom, nextTo, nextDate);
    setDayTrains(stored ?? []);
    setStatus(stored ? 'ready' : 'loading');

    setFrom(nextFrom);
    setTo(nextTo);
    setDate(nextDate);
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

      {from !== to && (
        <SyncStatus state={sync} counts={counts} progress={progress} />
      )}

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

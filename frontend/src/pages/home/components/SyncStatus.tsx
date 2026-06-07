/** The synchronisation state of the offline timetable data. */
export type SyncState = 'syncing' | 'synced' | 'offline';

interface SyncStatusProps {
  state: SyncState;
  counts: { today: number; tomorrow: number } | null;
  progress: { done: number; total: number } | null;
}

const LABELS: Record<SyncState, string> = {
  syncing: 'Mise à jour…',
  synced: 'Horaires à jour',
  offline: 'Hors ligne',
};

/**
 * A small dot + label showing whether today's and tomorrow's timetables have
 * been refreshed from the network (green), are being fetched (amber), or are
 * only available from the offline cache (grey). While syncing it shows how many
 * timetables have loaded; when up to date it shows how many trains run today and
 * tomorrow, as a reassurance the data really loaded.
 * @param props - The sync state, the today/tomorrow counts and the progress.
 */
export function SyncStatus(props: SyncStatusProps) {
  const { state, counts, progress } = props;
  return (
    <p className={`sync-status sync-${state}`} aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      {LABELS[state]}
      {state === 'syncing' && progress && (
        <span className="sync-counts">
          {' '}
          {progress.done}/{progress.total}
        </span>
      )}
      {state === 'synced' && counts && (
        <span className="sync-counts">
          {' · '}
          {counts.today} aujourd’hui / {counts.tomorrow} demain
        </span>
      )}
    </p>
  );
}

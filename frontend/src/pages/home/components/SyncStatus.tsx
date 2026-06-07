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
 * been refreshed (green), are being fetched (amber, with a progress bar that
 * advances as each day loads), or are only available from the offline cache
 * (grey). When up to date it shows how many trains run today and tomorrow.
 * @param props - The sync state, the today/tomorrow counts and the progress.
 */
export function SyncStatus(props: SyncStatusProps) {
  const { state, counts, progress } = props;
  const showBar = state === 'syncing' && progress !== null;

  return (
    <div className={`sync-status sync-${state}`} aria-live="polite">
      <span className="sync-row">
        <span className="sync-dot" aria-hidden="true" />
        {LABELS[state]}
        {showBar && (
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
      </span>
      {showBar && (
        <span className="sync-bar">
          <span
            className="sync-bar-fill"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </span>
      )}
    </div>
  );
}

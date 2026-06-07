/** The synchronisation state of the offline timetable data. */
export type SyncState = 'syncing' | 'synced' | 'offline';

interface SyncStatusProps {
  state: SyncState;
  counts: { today: number; tomorrow: number } | null;
}

const LABELS: Record<SyncState, string> = {
  syncing: 'Mise à jour…',
  synced: 'Horaires à jour',
  offline: 'Hors ligne',
};

/**
 * A small dot + label showing whether today's and tomorrow's timetables have
 * been refreshed from the network (green), are being fetched (amber), or are
 * only available from the offline cache (grey). When up to date, also shows how
 * many trains run today and tomorrow as a reassurance the data really loaded.
 * @param props - The current sync state and the today/tomorrow counts.
 */
export function SyncStatus(props: SyncStatusProps) {
  const { state, counts } = props;
  return (
    <p className={`sync-status sync-${state}`} aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      {LABELS[state]}
      {state === 'synced' && counts && (
        <span className="sync-counts">
          {' · '}
          {counts.today} aujourd’hui / {counts.tomorrow} demain
        </span>
      )}
    </p>
  );
}

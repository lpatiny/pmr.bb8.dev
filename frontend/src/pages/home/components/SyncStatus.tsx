/** The synchronisation state of the offline timetable data. */
export type SyncState = 'syncing' | 'synced' | 'offline';

interface SyncStatusProps {
  state: SyncState;
}

const LABELS: Record<SyncState, string> = {
  syncing: 'Mise à jour…',
  synced: 'Horaires à jour',
  offline: 'Hors ligne',
};

/**
 * A small dot + label showing whether today's and tomorrow's timetables have
 * been refreshed from the network (green), are being fetched (amber), or are
 * only available from the offline cache (grey).
 * @param props - The current sync state.
 */
export function SyncStatus(props: SyncStatusProps) {
  const { state } = props;
  return (
    <p className={`sync-status sync-${state}`} aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      {LABELS[state]}
    </p>
  );
}

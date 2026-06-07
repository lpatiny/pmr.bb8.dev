import type { AccessibleTrain } from '../../../api.ts';

import { TrainCard } from './TrainCard.tsx';

interface TrainListProps {
  status: 'loading' | 'ready' | 'error';
  trains: AccessibleTrain[];
  onRetry: () => void;
}

/**
 * Render the list of accessible trains, with loading / error / empty states.
 * @param props - The current status, the trains and a retry handler.
 */
export function TrainList(props: TrainListProps) {
  const { status, trains, onRetry } = props;

  if (status === 'loading') {
    return <p className="state-message">Recherche des trains…</p>;
  }

  if (status === 'error') {
    return (
      <div className="state-message">
        <p>Le service est momentanément indisponible.</p>
        <button type="button" className="retry-button" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    );
  }

  if (trains.length === 0) {
    return (
      <p className="state-message">
        Aucun train accessible n’est prévu pour le moment.
      </p>
    );
  }

  return (
    <ul className="train-list">
      {trains.map((train) => (
        <TrainCard
          key={`${train.trainNumber}-${train.departureTimestamp}`}
          train={train}
        />
      ))}
    </ul>
  );
}

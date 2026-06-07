import type { AccessibleTrain } from '../../../api.ts';

import { TrainCard } from './TrainCard.tsx';

interface TrainListProps {
  status: 'loading' | 'ready' | 'error';
  trains: AccessibleTrain[];
  extending: boolean;
  onRetry: () => void;
  onEarlier: () => void;
  onLater: () => void;
}

/**
 * Render the list of accessible trains, with loading / error / empty states
 * and "earlier" / "later" buttons to extend the list.
 * @param props - The status, the trains, the busy flag and the handlers.
 */
export function TrainList(props: TrainListProps) {
  const { status, trains, extending, onRetry, onEarlier, onLater } = props;

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
    <div>
      <button
        type="button"
        className="more-button"
        onClick={onEarlier}
        disabled={extending}
      >
        ↑ Trains plus tôt
      </button>

      <ul className="train-list">
        {trains.map((train) => (
          <TrainCard
            key={`${train.trainNumber}-${train.departureTimestamp}`}
            train={train}
          />
        ))}
      </ul>

      <button
        type="button"
        className="more-button"
        onClick={onLater}
        disabled={extending}
      >
        ↓ Trains plus tard
      </button>
    </div>
  );
}

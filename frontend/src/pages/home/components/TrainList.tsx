import { useTranslation } from 'react-i18next';

import type { AccessibleTrain } from '../../../api.ts';

import { TrainCard } from './TrainCard.tsx';

interface TrainListProps {
  status: 'loading' | 'ready' | 'error';
  trains: AccessibleTrain[];
  canEarlier: boolean;
  canLater: boolean;
  onRetry: () => void;
  onEarlier: () => void;
  onLater: () => void;
}

/**
 * Render the list of accessible trains, with loading / error / empty states
 * and "earlier" / "later" buttons that page through the loaded day (no network).
 * @param props - The status, the visible trains, the paging flags and handlers.
 */
export function TrainList(props: TrainListProps) {
  const { status, trains, canEarlier, canLater, onRetry, onEarlier, onLater } =
    props;
  const { t } = useTranslation();

  if (status === 'loading') {
    return <p className="state-message">{t('list.loading')}</p>;
  }

  if (status === 'error') {
    return (
      <div className="state-message">
        <p>{t('list.unavailable')}</p>
        <button type="button" className="retry-button" onClick={onRetry}>
          {t('list.retry')}
        </button>
      </div>
    );
  }

  if (trains.length === 0) {
    return <p className="state-message">{t('list.empty')}</p>;
  }

  return (
    <div>
      {canEarlier && (
        <button type="button" className="more-button" onClick={onEarlier}>
          {t('list.earlier')}
        </button>
      )}

      <ul className="train-list">
        {trains.map((train) => (
          <TrainCard
            key={`${train.trainNumber}-${train.departureTimestamp}`}
            train={train}
          />
        ))}
      </ul>

      {canLater && (
        <button type="button" className="more-button" onClick={onLater}>
          {t('list.later')}
        </button>
      )}
    </div>
  );
}

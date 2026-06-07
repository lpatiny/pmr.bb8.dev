import { useTranslation } from 'react-i18next';

import type { AccessibleTrain } from '../../../api.ts';

interface TrainCardProps {
  train: AccessibleTrain;
}

/**
 * A single accessible train, shown with large departure and arrival times.
 * @param props - The train to display.
 */
export function TrainCard(props: TrainCardProps) {
  const { train } = props;
  const { t } = useTranslation();

  return (
    <li className="train-card">
      <div className="train-times">
        <div className="train-time">
          <span className="train-time-value">{train.departureTime}</span>
          {train.departurePlatform ? (
            <span className="train-platform">
              {t('train.platform', { platform: train.departurePlatform })}
            </span>
          ) : null}
        </div>
        <span className="train-arrow" aria-hidden="true">
          →
        </span>
        <div className="train-time train-time-arrival">
          <span className="train-time-value">{train.arrivalTime}</span>
        </div>
      </div>

      <div className="train-badges">
        <span className="badge badge-accessible">{t('train.accessible')}</span>
        {train.bikeSpaces ? (
          <span className="badge badge-bike">
            {t('train.bikeSpaces', { spaces: train.bikeSpaces })}
          </span>
        ) : null}
        <span className="train-duration">
          {t('train.duration', { minutes: train.durationMinutes })}
        </span>
      </div>
    </li>
  );
}

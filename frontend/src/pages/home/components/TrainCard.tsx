import { useTranslation } from 'react-i18next';

import type { AccessibleTrain } from '../../../api.ts';
import { timeInBrussels } from '../dates.ts';

interface TrainCardProps {
  train: AccessibleTrain;
}

const MINUTE_MS = 60_000;

/**
 * A single accessible train, shown with large departure and arrival times.
 * Real-time delays are shown as the new expected time with the scheduled time
 * struck through; cancelled trains are flagged and struck through.
 * @param props - The train to display.
 */
export function TrainCard(props: TrainCardProps) {
  const { train } = props;
  const { t } = useTranslation();

  const departureDelayed = !train.isCancelled && train.departureDelay > 0;
  const arrivalDelayed = !train.isCancelled && train.arrivalDelay > 0;
  const realDeparture = departureDelayed
    ? timeInBrussels(train.departureTimestamp + train.departureDelay * MINUTE_MS)
    : train.departureTime;
  const realArrival = arrivalDelayed
    ? timeInBrussels(
        train.departureTimestamp +
          (train.durationMinutes + train.arrivalDelay) * MINUTE_MS,
      )
    : train.arrivalTime;

  return (
    <li className={`train-card ${train.isCancelled ? 'train-card-cancelled' : ''}`}>
      <div className="train-times">
        <div className="train-time">
          {departureDelayed ? (
            <span className="train-time-scheduled">{train.departureTime}</span>
          ) : null}
          <span
            className={`train-time-value ${departureDelayed ? 'train-time-late' : ''} ${train.isCancelled ? 'train-time-cancelled' : ''}`}
          >
            {realDeparture}
          </span>
          {departureDelayed ? (
            <span className="train-delay">
              {t('train.delayed', { minutes: train.departureDelay })}
            </span>
          ) : null}
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
          {arrivalDelayed ? (
            <span className="train-time-scheduled">{train.arrivalTime}</span>
          ) : null}
          <span
            className={`train-time-value ${arrivalDelayed ? 'train-time-late' : ''} ${train.isCancelled ? 'train-time-cancelled' : ''}`}
          >
            {realArrival}
          </span>
        </div>
      </div>

      <div className="train-badges">
        {train.isCancelled ? (
          <span className="badge badge-cancelled">{t('train.cancelled')}</span>
        ) : null}
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

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

  return (
    <li className="train-card">
      <div className="train-times">
        <div className="train-time">
          <span className="train-time-value">{train.departureTime}</span>
          {train.departurePlatform ? (
            <span className="train-platform">
              Voie {train.departurePlatform}
            </span>
          ) : null}
        </div>
        <span className="train-arrow" aria-hidden="true">
          →
        </span>
        <div className="train-time">
          <span className="train-time-value">{train.arrivalTime}</span>
          {train.arrivalPlatform ? (
            <span className="train-platform">Voie {train.arrivalPlatform}</span>
          ) : null}
        </div>
      </div>

      <div className="train-badges">
        <span className="badge badge-accessible">♿ Accessible</span>
        {train.bikeSpaces ? (
          <span className="badge badge-bike">🚲 {train.bikeSpaces} places</span>
        ) : null}
        <span className="train-duration">{train.durationMinutes} min</span>
      </div>
    </li>
  );
}

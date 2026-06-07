import type { Direction } from '../../../api.ts';

interface DirectionTabsProps {
  direction: Direction;
  onChange: (direction: Direction) => void;
}

const TABS: Array<{ value: Direction; from: string; to: string }> = [
  { value: 'oostende-bruges', from: 'Ostende', to: 'Bruges' },
  { value: 'bruges-oostende', from: 'Bruges', to: 'Ostende' },
];

/**
 * Two large tabs to pick the travel direction.
 * @param props - The current direction and the change handler.
 */
export function DirectionTabs(props: DirectionTabsProps) {
  const { direction, onChange } = props;

  return (
    <div className="tabs" role="tablist" aria-label="Choisir la direction">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={direction === tab.value}
          className={`tab ${direction === tab.value ? 'tab-active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          <span className="tab-from">{tab.from}</span>
          <span className="tab-arrow" aria-hidden="true">
            →
          </span>
          <span className="tab-to">{tab.to}</span>
        </button>
      ))}
    </div>
  );
}

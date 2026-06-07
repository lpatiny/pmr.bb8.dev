import type { Station } from '../../../api.ts';

import { StationSelect } from './StationSelect.tsx';

interface SearchControlsProps {
  stations: Station[];
  from: string;
  to: string;
  date: string;
  onFromChange: (stationId: string) => void;
  onToChange: (stationId: string) => void;
  onDateChange: (date: string) => void;
  onSwap: () => void;
}

/**
 * The search form: origin, destination, a swap button and a date picker.
 * @param props - The stations, the current selection and the change handlers.
 */
export function SearchControls(props: SearchControlsProps) {
  const {
    stations,
    from,
    to,
    date,
    onFromChange,
    onToChange,
    onDateChange,
    onSwap,
  } = props;

  return (
    <div className="controls">
      <div className="controls-stations">
        <StationSelect
          id="from"
          label="De"
          stations={stations}
          value={from}
          onChange={onFromChange}
        />
        <button
          type="button"
          className="swap-button"
          onClick={onSwap}
          aria-label="Inverser les gares"
          title="Inverser les gares"
        >
          ⇅
        </button>
        <StationSelect
          id="to"
          label="Vers"
          stations={stations}
          value={to}
          onChange={onToChange}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          className="field-input"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>
    </div>
  );
}

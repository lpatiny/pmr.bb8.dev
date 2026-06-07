import { useState } from 'react';

import type { Station } from '../../../api.ts';
import { todayInBrussels, tomorrowInBrussels } from '../dates.ts';

import { StationSelect } from './StationSelect.tsx';

interface SearchControlsProps {
  stations: Station[];
  from: string;
  to: string;
  date: string;
  hour: string;
  onFromChange: (stationId: string) => void;
  onToChange: (stationId: string) => void;
  onDateChange: (date: string) => void;
  onHourChange: (hour: string) => void;
  onSwap: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, '0'),
);

/**
 * The search form: origin, destination, swap, date (today / tomorrow / custom)
 * and departure hour.
 * @param props - The stations, the current selection and the change handlers.
 */
export function SearchControls(props: SearchControlsProps) {
  const {
    stations,
    from,
    to,
    date,
    hour,
    onFromChange,
    onToChange,
    onDateChange,
    onHourChange,
    onSwap,
  } = props;

  const today = todayInBrussels();
  const tomorrow = tomorrowInBrussels();
  const isToday = date === today;
  const isTomorrow = date === tomorrow;

  const [showCustom, setShowCustom] = useState(false);
  const customActive = showCustom || (!isToday && !isTomorrow);

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
        <span className="field-label">Date</span>
        <div className="choice-row">
          <button
            type="button"
            className={`choice ${isToday ? 'choice-active' : ''}`}
            onClick={() => {
              setShowCustom(false);
              onDateChange(today);
            }}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            className={`choice ${isTomorrow ? 'choice-active' : ''}`}
            onClick={() => {
              setShowCustom(false);
              onDateChange(tomorrow);
            }}
          >
            Demain
          </button>
          <button
            type="button"
            className={`choice ${customActive ? 'choice-active' : ''}`}
            onClick={() => setShowCustom(true)}
          >
            Autre date
          </button>
        </div>
        {customActive ? (
          <input
            className="field-input"
            type="date"
            value={date}
            min={today}
            onChange={(event) => onDateChange(event.target.value)}
          />
        ) : null}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="hour">
          Heure de départ
        </label>
        <select
          id="hour"
          className="field-input"
          value={hour}
          onChange={(event) => onHourChange(event.target.value)}
        >
          <option value="">Dès maintenant</option>
          {HOURS.map((value) => (
            <option key={value} value={value}>
              {value} h
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

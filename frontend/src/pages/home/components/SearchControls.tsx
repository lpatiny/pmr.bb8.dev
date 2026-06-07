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

  const [showHourGrid, setShowHourGrid] = useState(false);
  const hourGridActive = showHourGrid || hour !== '';

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
        <span className="field-label">Heure de départ</span>
        <div className="choice-row choice-row-2">
          <button
            type="button"
            className={`choice ${!hourGridActive ? 'choice-active' : ''}`}
            onClick={() => {
              setShowHourGrid(false);
              onHourChange('');
            }}
          >
            Dès que possible
          </button>
          <button
            type="button"
            className={`choice ${hourGridActive ? 'choice-active' : ''}`}
            onClick={() => setShowHourGrid(true)}
          >
            Choisir l’heure
          </button>
        </div>
        {hourGridActive ? (
          <div className="hour-grid">
            {HOURS.map((value) => (
              <button
                key={value}
                type="button"
                className={`choice ${hour === value ? 'choice-active' : ''}`}
                onClick={() => onHourChange(value)}
              >
                {value} h
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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

  const [swapFlash, setSwapFlash] = useState(0);
  function handleSwap() {
    onSwap();
    setSwapFlash((count) => count + 1);
  }

  return (
    <div className="controls">
      <div
        key={swapFlash}
        className={`controls-stations ${swapFlash ? 'controls-stations-flash' : ''}`}
      >
        <StationSelect
          id="from"
          label={t('search.from')}
          stations={stations}
          value={from}
          onChange={onFromChange}
        />
        <button
          type="button"
          className="swap-button"
          onClick={handleSwap}
          aria-label={t('search.swap')}
          title={t('search.swap')}
        >
          ⇅
        </button>
        <StationSelect
          id="to"
          label={t('search.to')}
          stations={stations}
          value={to}
          onChange={onToChange}
        />
      </div>

      <div className="field">
        <span className="field-label">{t('search.date')}</span>
        <div className="choice-row">
          <button
            type="button"
            className={`choice ${isToday ? 'choice-active' : ''}`}
            onClick={() => {
              setShowCustom(false);
              onDateChange(today);
            }}
          >
            {t('search.today')}
          </button>
          <button
            type="button"
            className={`choice ${isTomorrow ? 'choice-active' : ''}`}
            onClick={() => {
              setShowCustom(false);
              onDateChange(tomorrow);
            }}
          >
            {t('search.tomorrow')}
          </button>
          <button
            type="button"
            className={`choice ${customActive ? 'choice-active' : ''}`}
            onClick={() => setShowCustom(true)}
          >
            {t('search.otherDate')}
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
        <span className="field-label">{t('search.departureTime')}</span>
        <div className="choice-row choice-row-2">
          <button
            type="button"
            className={`choice ${!hourGridActive ? 'choice-active' : ''}`}
            onClick={() => {
              setShowHourGrid(false);
              onHourChange('');
            }}
          >
            {t('search.asSoon')}
          </button>
          <button
            type="button"
            className={`choice ${hourGridActive ? 'choice-active' : ''}`}
            onClick={() => setShowHourGrid(true)}
          >
            {t('search.chooseTime')}
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
                {t('search.hour', { value })}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

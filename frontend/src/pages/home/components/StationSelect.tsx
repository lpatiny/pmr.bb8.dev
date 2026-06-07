import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Station } from '../../../api.ts';
import { stationLabel } from '../../../i18n/stationLabel.ts';

interface StationSelectProps {
  id: string;
  label: string;
  stations: Station[];
  value: string;
  onChange: (stationId: string) => void;
}

/**
 * A large, type-to-search station picker built on a native datalist. Names are
 * shown in the active language (French `name` / Dutch `standardname`), but a
 * station typed in either language still resolves.
 * @param props - The field id/label, the stations and the selected value.
 */
export function StationSelect(props: StationSelectProps) {
  const { id, label, stations, value, onChange } = props;
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  // Resolve a typed value from either the French or the Dutch name.
  const idByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const station of stations) {
      map.set(station.name, station.id);
      map.set(station.standardname, station.id);
    }
    return map;
  }, [stations]);

  const sorted = useMemo(
    () =>
      stations
        .map((station) => ({
          station,
          primary: stationLabel(station, language),
        }))
        .toSorted((a, b) => a.primary.localeCompare(b.primary, language)),
    [stations, language],
  );

  const current = stations.find((station) => station.id === value);

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {/* key forces a remount (resetting the text) when the value or language
          changes externally, e.g. on swap or when switching FR/NL. */}
      <input
        key={`${value}-${language}`}
        id={id}
        className="field-input"
        list={`${id}-list`}
        defaultValue={current ? stationLabel(current, language) : ''}
        placeholder={t('station.placeholder')}
        autoComplete="off"
        onChange={(event) => {
          const stationId = idByName.get(event.target.value);
          if (stationId) onChange(stationId);
        }}
      />
      <datalist id={`${id}-list`}>
        {sorted.map(({ station, primary }) => {
          const other =
            station.name === station.standardname
              ? ''
              : language === 'nl'
                ? station.name
                : station.standardname;
          return (
            <option key={station.id} value={primary}>
              {other}
            </option>
          );
        })}
      </datalist>
    </div>
  );
}

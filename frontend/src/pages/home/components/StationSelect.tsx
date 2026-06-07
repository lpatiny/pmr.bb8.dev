import { useMemo } from 'react';

import type { Station } from '../../../api.ts';

interface StationSelectProps {
  id: string;
  label: string;
  stations: Station[];
  value: string;
  onChange: (stationId: string) => void;
}

/**
 * A large, type-to-search station picker built on a native datalist.
 * @param props - The field id/label, the stations and the selected value.
 */
export function StationSelect(props: StationSelectProps) {
  const { id, label, stations, value, onChange } = props;

  const idByName = useMemo(
    () => new Map(stations.map((station) => [station.name, station.id])),
    [stations],
  );
  const current = stations.find((station) => station.id === value);

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {/* key forces a remount (resetting the text) when the value changes externally, e.g. on swap. */}
      <input
        key={value}
        id={id}
        className="field-input"
        list={`${id}-list`}
        defaultValue={current?.name ?? ''}
        placeholder="Taper le nom d’une gare…"
        autoComplete="off"
        onChange={(event) => {
          const stationId = idByName.get(event.target.value);
          if (stationId) onChange(stationId);
        }}
      />
      <datalist id={`${id}-list`}>
        {stations.map((station) => (
          <option key={station.id} value={station.name}>
            {station.standardname !== station.name ? station.standardname : ''}
          </option>
        ))}
      </datalist>
    </div>
  );
}

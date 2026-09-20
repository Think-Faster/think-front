import { useEffect, useState } from 'react';

import { useInterval } from '../../shared/hooks/useInterval';

interface StreamRow {
  time: string;
  sensor: string;
  value: string;
}

interface StreamWidgetProps {
  sensor?: string;
  baseValue?: number;
  unit?: string;
  intervalMs?: number;
  maxRows?: number;
}

export default function StreamWidget({
  sensor = 'T-142-04',
  baseValue = 83.1,
  unit = '°C',
  intervalMs = 2600,
  maxRows = 40,
}: StreamWidgetProps) {
  const [rows, setRows] = useState<StreamRow[]>([]);

  function makeRow(): StreamRow {
    return {
      time: new Date().toLocaleTimeString('ru-RU', { hour12: false }),
      sensor,
      value: `${(baseValue + Math.random() * 0.3).toFixed(1)} ${unit}`,
    };
  }

  useEffect(() => {
    setRows(current => [makeRow(), ...current].slice(0, maxRows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(() => {
    setRows(current => [makeRow(), ...current].slice(0, maxRows));
  }, intervalMs);

  return (
    <div>
      {rows.map((row, index) => (
        <div className="stream-row" key={`${row.time}-${index}`}>
          <span className="t">{row.time}</span>
          <span className="s">{row.sensor}</span>
          <span className="v">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

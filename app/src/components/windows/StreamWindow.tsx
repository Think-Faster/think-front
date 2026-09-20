import { useEffect, useState } from 'react';

interface Row {
  time: string;
  sensor: string;
  value: string;
}

export default function StreamWindow() {
  const [rows, setRows] =
    useState<Row[]>([]);

  useEffect(() => {
    function addRow() {
      setRows(current => [
        {
          time:
            new Date().toLocaleTimeString(
              'ru-RU',
              { hour12: false }
            ),
          sensor: 'T-142-04',
          value:
            `${(83.1 + Math.random() * 0.3).toFixed(1)} °C`,
        },
        ...current,
      ].slice(0, 40));
    }

    addRow();

    const timer = setInterval(
      addRow,
      2600
    );

    return () =>
      clearInterval(timer);
  }, []);

  return (
    <div>
      {rows.map((row, index) => (
        <div
          className="stream-row"
          key={`${row.time}-${index}`}
        >
          <span className="t">
            {row.time}
          </span>

          <span className="s">
            {row.sensor}
          </span>

          <span className="v">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
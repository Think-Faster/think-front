import { ReactNode } from 'react';

import SensorRow from '../../shared/ui/SensorRow';

interface SchematicSensor {
  name: string;
  location: string;
  value: string;
}

interface SchematicWidgetProps {
  title?: ReactNode;
  sensors?: SchematicSensor[];
  selectedRange?: string;
}

const defaultTitle = (
  <>
    Коллектор <b>К-142</b> · участок 24+000 — 24+400 · направление стока: юг
  </>
);

const defaultSensors: SchematicSensor[] = [
  { name: 'T-142-04', location: '24+340 · температура', value: '83.1 °C' },
  { name: 'P-142-02', location: '24+310 · давление', value: '4.6 бар' },
  { name: 'F-142-01', location: '24+000 · расход', value: '212 м³/ч' },
];

export default function SchematicWidget({
  title = defaultTitle,
  sensors = defaultSensors,
  selectedRange = '24+300–24+400',
}: SchematicWidgetProps) {
  return (
    <div className="schem-wrap">
      <div className="schem-title">{title}</div>

      <div className="picket-track">
        <div className="picket-base" />

        <div className="picket-seg sel" style={{ left: '75%', width: '25%' }} />

        <div className="picket-marks">
          <span>24+000</span>
          <span>24+100</span>
          <span>24+200</span>
          <span>24+300</span>
          <span>24+400</span>
        </div>

        <div className="anomaly-flag" style={{ left: '87%' }}>
          <div className="card">аномалия</div>
          <div className="stem" />
          <div className="pt" />
        </div>
      </div>

      <div className="seg-info">
        Выбран участок: <b>{selectedRange}</b>
      </div>

      {sensors.map(sensor => (
        <SensorRow key={sensor.name} {...sensor} />
      ))}
    </div>
  );
}

interface SensorRowProps {
  name: string;
  location: string;
  value: string;
}

export default function SensorRow({ name, location, value }: SensorRowProps) {
  return (
    <div className="sensor-row">
      <div>
        <div className="sensor-name">{name}</div>
        <div className="sensor-loc">{location}</div>
      </div>

      <div className="sensor-val">{value}</div>
    </div>
  );
}

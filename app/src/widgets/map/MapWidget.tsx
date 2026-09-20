interface MapPinData {
  object: string;
  risk: string;
  top: string;
  left: string;
}

interface MapWidgetProps {
  pins?: MapPinData[];
  riskZone?: { top: string; left: string };
}

const defaultPins: MapPinData[] = [
  { object: 'К-142', risk: 'high', top: '38%', left: '52%' },
  { object: 'НС-7', risk: 'med', top: '60%', left: '28%' },
  { object: 'ТК-18', risk: 'low', top: '22%', left: '74%' },
  { object: 'К-90', risk: 'high', top: '74%', left: '66%' },
];

export default function MapWidget({
  pins = defaultPins,
  riskZone = { top: '38%', left: '52%' },
}: MapWidgetProps) {
  return (
    <div className="map-wrap">
      <div className="map-net">
        <div className="risk-zone" style={riskZone} />

        {pins.map(pin => (
          <MapPin key={pin.object} {...pin} />
        ))}
      </div>

      <div className="map-legend">
        <span>
          <i className="legend-red" />
          высокий риск
        </span>

        <span>
          <i className="legend-amber" />
          средний
        </span>

        <span>
          <i className="legend-cyan" />
          наблюдение
        </span>
      </div>
    </div>
  );
}

function MapPin({ object, risk, top, left }: MapPinData) {
  return (
    <div className={`map-pin ${risk}`} style={{ top, left }}>
      <span className="dot" />
      <span className="lbl">{object}</span>
    </div>
  );
}

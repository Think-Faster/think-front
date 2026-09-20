export default function MapWindow() {
  return (
    <div className="map-wrap">

      <div className="map-net">

        <div
          className="risk-zone"
          style={{
            top: '38%',
            left: '52%',
          }}
        />

        <MapPin
          object="К-142"
          risk="high"
          top="38%"
          left="52%"
        />

        <MapPin
          object="НС-7"
          risk="med"
          top="60%"
          left="28%"
        />

        <MapPin
          object="ТК-18"
          risk="low"
          top="22%"
          left="74%"
        />

        <MapPin
          object="К-90"
          risk="high"
          top="74%"
          left="66%"
        />

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

function MapPin({
  object,
  risk,
  top,
  left,
}: {
  object: string;
  risk: string;
  top: string;
  left: string;
}) {
  return (
    <div
      className={`map-pin ${risk}`}
      style={{ top, left }}
    >
      <span className="dot" />
      <span className="lbl">
        {object}
      </span>
    </div>
  );
}
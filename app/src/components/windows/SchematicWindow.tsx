export default function SchematicWindow() {
  return (
    <div className="schem-wrap">

      <div className="schem-title">
        Коллектор <b>К-142</b> · участок
        24+000 — 24+400 · направление
        стока: юг
      </div>

      <div className="picket-track">

        <div className="picket-base" />

        <div
          className="picket-seg sel"
          style={{
            left: '75%',
            width: '25%',
          }}
        />

        <div className="picket-marks">
          <span>24+000</span>
          <span>24+100</span>
          <span>24+200</span>
          <span>24+300</span>
          <span>24+400</span>
        </div>

        <div
          className="anomaly-flag"
          style={{ left: '87%' }}
        >
          <div className="card">
            аномалия
          </div>

          <div className="stem" />
          <div className="pt" />
        </div>

      </div>

      <div className="seg-info">
        Выбран участок:{' '}
        <b>24+300–24+400</b>
      </div>

      <Sensor
        name="T-142-04"
        location="24+340 · температура"
        value="83.1 °C"
      />

      <Sensor
        name="P-142-02"
        location="24+310 · давление"
        value="4.6 бар"
      />

      <Sensor
        name="F-142-01"
        location="24+000 · расход"
        value="212 м³/ч"
      />

    </div>
  );
}

function Sensor({
  name,
  location,
  value,
}: {
  name: string;
  location: string;
  value: string;
}) {
  return (
    <div className="sensor-row">

      <div>

        <div className="sensor-name">
          {name}
        </div>

        <div className="sensor-loc">
          {location}
        </div>

      </div>

      <div className="sensor-val">
        {value}
      </div>

    </div>
  );
}
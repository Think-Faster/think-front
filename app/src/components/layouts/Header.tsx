import { useEffect, useState } from 'react';

export default function Header() {
  const [clock, setClock] = useState('');

  useEffect(() => {
    function update() {
      setClock(
        new Date().toLocaleTimeString(
          'ru-RU'
        )
      );
    }

    update();

    const timer = setInterval(
      update,
      1000
    );

    return () =>
      clearInterval(timer);
  }, []);

  return (
    <header>

      <div className="header-row">

        <div className="brand">
          <span className="brand-mark" />
          КОНТУР
        </div>

        <div className="crumb">
          <span>Город N</span>
          <span className="sep">/</span>

          <span>Южный узел</span>
          <span className="sep">/</span>

          <b>К-142</b>

          <span className="sep">/</span>

          <span>пикет 24+350</span>
        </div>

        <div className="header-spacer" />

        <div className="header-meta">

          <span>
            Диспетчер · смена Б
          </span>

          <span className="clock">
            {clock}
          </span>

          <div className="bell">
            <span>♧</span>
            <span className="dot">
              3
            </span>
          </div>

          <div className="avatar">
            ДВ
          </div>

        </div>

      </div>

      <div className="status-strip">

        <Status
          value="2"
          label="критических"
          className="crit"
        />

        <Status
          value="3"
          label="новых прогнозов"
          className="pred"
        />

        <Status
          value="7"
          label="в работе"
        />

        <Status
          value="148"
          label="сенсоров онлайн"
          className="live"
        />

        <Status
          value="1"
          label="просроченная задача"
        />

      </div>

    </header>
  );
}

function Status({
  value,
  label,
  className = '',
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`status-item ${className}`}>
      <span className="status-num">
        {value}
      </span>

      <span className="status-label">
        {label}
      </span>
    </div>
  );
}
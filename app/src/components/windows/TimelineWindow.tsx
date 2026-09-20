export default function TimelineWindow() {
  return (
    <div className="tl-wrap">

      <Timeline
        time="12:41"
        text="Система обнаружила аномалию на T-142-04"
        who="Система"
        done
      />

      <Timeline
        time="12:42"
        text="Создан прогноз «Повреждение коллектора», 87%"
        who="Prediction engine"
        done
      />

      <Timeline
        time="12:45"
        text="Диспетчер проверил данные сенсоров и историю участка"
        who="Дежурный В. — диспетчер"
        done
      />

      <Timeline
        time="—"
        text="Ожидает решения диспетчера"
        who="—"
        now
      />

      <Timeline
        time="—"
        text="Назначен инженер"
        who="—"
      />

      <Timeline
        time="—"
        text="Выездной осмотр и результат"
        who="—"
      />

    </div>
  );
}

function Timeline({
  time,
  text,
  who,
  done,
  now,
}: {
  time: string;
  text: string;
  who: string;
  done?: boolean;
  now?: boolean;
}) {
  return (
    <div
      className={`tl-item ${
        done ? 'done' : ''
      } ${now ? 'now' : ''}`}
    >
      <div className="tl-dot" />

      <div>

        <div className="tl-time">
          {time}
        </div>

        <div className="tl-text">
          {text}
        </div>

        <div className="tl-who">
          {who}
        </div>

      </div>

    </div>
  );
}
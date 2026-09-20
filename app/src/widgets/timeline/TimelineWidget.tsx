interface TimelineEvent {
  time: string;
  text: string;
  who: string;
  done?: boolean;
  now?: boolean;
}

interface TimelineWidgetProps {
  events?: TimelineEvent[];
}

const defaultEvents: TimelineEvent[] = [
  {
    time: '12:41',
    text: 'Система обнаружила аномалию на T-142-04',
    who: 'Система',
    done: true,
  },
  {
    time: '12:42',
    text: 'Создан прогноз «Повреждение коллектора», 87%',
    who: 'Prediction engine',
    done: true,
  },
  {
    time: '12:45',
    text: 'Диспетчер проверил данные сенсоров и историю участка',
    who: 'Дежурный В. — диспетчер',
    done: true,
  },
  { time: '—', text: 'Ожидает решения диспетчера', who: '—', now: true },
  { time: '—', text: 'Назначен инженер', who: '—' },
  { time: '—', text: 'Выездной осмотр и результат', who: '—' },
];

export default function TimelineWidget({ events = defaultEvents }: TimelineWidgetProps) {
  return (
    <div className="tl-wrap">
      {events.map((event, index) => (
        <TimelineItem key={index} {...event} />
      ))}
    </div>
  );
}

function TimelineItem({ time, text, who, done, now }: TimelineEvent) {
  return (
    <div className={`tl-item ${done ? 'done' : ''} ${now ? 'now' : ''}`}>
      <div className="tl-dot" />

      <div>
        <div className="tl-time">{time}</div>
        <div className="tl-text">{text}</div>
        <div className="tl-who">{who}</div>
      </div>
    </div>
  );
}

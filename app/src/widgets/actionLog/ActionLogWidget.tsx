interface LogEntry {
  time: string;
  text: string;
}

interface ActionLogWidgetProps {
  entries?: LogEntry[];
}

const defaultEntries: LogEntry[] = [
  { time: '12:45', text: 'Диспетчер проверил данные сенсоров и историю участка' },
  { time: '12:42', text: 'Создан прогноз «Повреждение коллектора», 87%' },
  { time: '12:41', text: 'Система обнаружила аномалию на T-142-04' },
];

export default function ActionLogWidget({ entries = defaultEntries }: ActionLogWidgetProps) {
  return (
    <div>
      {entries.map((entry, index) => (
        <div className="log-row" key={index}>
          <span className="t">{entry.time}</span>
          <span>{entry.text}</span>
        </div>
      ))}
    </div>
  );
}

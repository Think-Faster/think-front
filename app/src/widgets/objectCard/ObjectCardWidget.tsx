import Tag from '../../shared/ui/Tag';

interface HistoryEntry {
  title: string;
  status: string;
}

interface ObjectCardWidgetProps {
  objectTitle?: string;
  topic?: string;
  description?: string;
  sensorTags?: string[];
  sectionRangeLabel?: string;
  history?: HistoryEntry[];
}

const defaultSensorTags = ['T-142-04', 'P-142-02', 'F-142-01'];

const defaultHistory: HistoryEntry[] = [
  { title: 'Повреждение коллектора', status: 'активен' },
];

export default function ObjectCardWidget({
  objectTitle = 'К-142 · Коллектор, Южный узел',
  topic = 'Повреждение коллектора',
  description = 'Зафиксирован рост температуры и изменение давления на участке 24+300–24+400.',
  sensorTags = defaultSensorTags,
  sectionRangeLabel = '24+000 ──────── 24+400',
  history = defaultHistory,
}: ObjectCardWidgetProps) {
  return (
    <div className="obj-grid">
      <div className="obj-left">
        <div className="obj-field-label">Объект</div>
        <div className="obj-field-val title">{objectTitle}</div>

        <div className="obj-field-label">Тема</div>
        <div className="obj-field-val">{topic}</div>

        <div className="obj-field-label">Описание</div>
        <div className="obj-field-val">{description}</div>

        <div className="obj-field-label">Датчики</div>

        {sensorTags.map(tag => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      <div className="obj-right">
        <div className="obj-field-label">Участок схемы</div>

        <div className="mini-schem">
          <i />
        </div>

        <div className="mini-schem-lbl">{sectionRangeLabel}</div>

        <div className="obj-field-label">История прогнозов</div>

        {history.map(item => (
          <div className="hist-item" key={item.title}>
            <span>{item.title}</span>
            <span className="d">{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

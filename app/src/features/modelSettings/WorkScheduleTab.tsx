import { useMemo, useState } from 'react';

import Badge from '../../shared/ui/Badge';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { predictionTypeLabels } from '../predictions/predictionLabels';
import { useWorkSchedule } from './hooks/useWorkSchedule';
import { workSourceLabels } from './modelSettingsLabels';

type WorkPeriod = 'upcoming' | 'all';

const periodOptions: { value: WorkPeriod; label: string }[] = [
  { value: 'upcoming', label: 'Идут и впереди' },
  { value: 'all', label: 'Весь график' },
];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

// Только просмотр: правка графика (POST/PUT/DELETE work-schedule) — отдельная задача.
export default function WorkScheduleTab() {
  const [period, setPeriod] = useState<WorkPeriod>('upcoming');
  // Начало суток, чтобы список не перезапрашивался на каждом рендере.
  const from = useMemo(() => {
    if (period === 'all') {
      return undefined;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, [period]);

  const { works, loading, error } = useWorkSchedule(from);
  const now = Date.now();

  return (
    <div>
      <div className="win-toolbar">
        <ChipFilterGroup options={periodOptions} value={period} onChange={setPeriod} />
      </div>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && works.length === 0 && <EmptyState>Плановых работ нет</EmptyState>}

      {!loading &&
        works.map(work => {
          const running = new Date(work.startsAt).getTime() <= now && now < new Date(work.endsAt).getTime();

          return (
            <div className="hist-item" key={work.workId}>
              <div>
                <div>
                  {work.workKind}
                  {work.objectId !== null ? ` · объект #${work.objectId}` : ''}
                </div>
                <div className="d">
                  {formatDateTime(work.startsAt)} — {formatDateTime(work.endsAt)}
                  {work.incidentTypes.length > 0 &&
                    ` · глушит: ${work.incidentTypes.map(type => predictionTypeLabels[type] ?? type).join(', ')}`}
                  {work.removedSensor ? ` · снят: ${work.removedSensor}` : ''}
                </div>
                <div className="d">
                  {workSourceLabels[work.source] ?? work.source}
                  {work.version > 1 ? ` · версия ${work.version}` : ''}
                  {work.comment ? ` · ${work.comment}` : ''}
                </div>
              </div>

              {running && <Badge tone="med">идёт</Badge>}
            </div>
          );
        })}
    </div>
  );
}

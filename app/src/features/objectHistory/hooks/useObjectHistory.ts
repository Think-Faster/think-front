import { useCallback, useEffect, useState } from 'react';

import { PagedResult } from '../../../core/api/types';
import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { usePermission } from '../../../core/permissions/permissionService';
import { factAlertRepository } from '../../../entities/factAlert/factAlertRepository';
import { FactAlert } from '../../../entities/factAlert/types';
import { incidentRepository } from '../../../entities/incident/incidentRepository';
import { Incident } from '../../../entities/incident/types';
import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { PredictionListItem } from '../../../entities/prediction/types';
import { taskRepository } from '../../../entities/task/taskRepository';
import { WorkTaskListItem } from '../../../entities/task/types';
import { formatProbability, predictionStatusLabels, predictionTypeLabels, probabilityTone } from '../../predictions/predictionLabels';
import { taskStatusLabels, taskStatusTone } from '../../tasks/taskLabels';

export type EntryKind = 'prediction' | 'incident' | 'task' | 'factAlert';

export interface HistoryEntry {
  key: string;
  kind: EntryKind;
  at: string;
  title: string;
  meta: string;
  badge: string;
  tone: string;
  to?: string;
}

// Сколько записей брать из каждого источника. Ленту по нескольким
// источникам постранично с BFF не склеить (у каждого своя сортировка и свой
// total), поэтому берём последние записи каждого и листаем уже общую ленту.
export const SOURCE_LIMIT = 100;
// У /tasks нет фильтра по объекту — заявки фильтруем на клиенте из более
// широкой выборки.
const TASK_SCAN_LIMIT = 500;

// Источник, на который у пользователя нет права, не запрашиваем — BFF
// ответил бы 403 и уронил бы всю ленту.
function nothing<T>(): Promise<PagedResult<T>> {
  return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 });
}

// Лента событий объекта: прогнозы, происшествия, заявки и тревоги по факту,
// новые сверху.
export function useObjectHistory(objectId: number | null) {
  const canPredictions = usePermission('predictions', 'read');
  const canIncidents = usePermission('incidents', 'read');
  const canTasks = usePermission('tasks', 'read');

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (objectId === null) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      canPredictions ? predictionRepository.getList({ objectId, pageSize: SOURCE_LIMIT }) : nothing<PredictionListItem>(),
      canIncidents ? incidentRepository.getList({ objectId, pageSize: SOURCE_LIMIT }) : nothing<Incident>(),
      canTasks ? taskRepository.getList({ pageSize: TASK_SCAN_LIMIT }) : nothing<WorkTaskListItem>(),
      canPredictions ? factAlertRepository.getList({ objectId, pageSize: SOURCE_LIMIT }) : nothing<FactAlert>(),
    ])
      .then(([predictions, incidents, tasks, alerts]) => {
        if (cancelled) {
          return;
        }

        const merged: HistoryEntry[] = [
          ...predictions.items.map(prediction => ({
            key: `p:${prediction.id}`,
            kind: 'prediction' as const,
            at: prediction.hourEnd,
            title: `${predictionTypeLabels[prediction.type]} · ${prediction.topic}`,
            meta: predictionStatusLabels[prediction.status],
            badge: formatProbability(prediction.probability),
            tone: probabilityTone(prediction.probability),
            to: `/predictions/${prediction.id}`,
          })),
          ...incidents.items.map(incident => ({
            key: `i:${incident.id}`,
            kind: 'incident' as const,
            at: incident.startedAt,
            title: predictionTypeLabels[incident.type],
            meta: incident.outcome ?? '',
            badge: incident.confirmedAt ? 'подтверждено' : 'не подтверждено',
            tone: incident.confirmedAt ? 'low' : 'high',
            to: incident.taskId ? `/tasks/${incident.taskId}` : undefined,
          })),
          ...tasks.items
            .filter(task => task.objectId === objectId)
            .map(task => ({
              key: `t:${task.id}`,
              kind: 'task' as const,
              at: task.createdAt,
              title: `№${task.number} · ${task.topic}`,
              meta: '',
              badge: taskStatusLabels[task.status],
              tone: taskStatusTone(task.status),
              to: `/tasks/${task.id}`,
            })),
          ...alerts.items.map(alert => ({
            key: `a:${alert.id}`,
            kind: 'factAlert' as const,
            at: alert.announcedAt,
            title: predictionTypeLabels[alert.type],
            meta: alert.triggerSensorIds.length > 0 ? `датчики ${alert.triggerSensorIds.join(', ')}` : '',
            badge: alert.status,
            tone: 'high',
          })),
        ];

        merged.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
        setEntries(merged);
        setTruncated(
          predictions.total > predictions.items.length ||
            incidents.total > incidents.items.length ||
            tasks.total > tasks.items.length ||
            alerts.total > alerts.items.length
        );
      })
      .catch(err => {
        if (!cancelled) {
          setEntries([]);
          setError(formatBffErrorMessage(err, 'Не удалось загрузить историю объекта.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [objectId, nonce, canPredictions, canIncidents, canTasks]);

  const reload = useCallback(() => setNonce(value => value + 1), []);

  return { entries, truncated, loading, error, reload };
}

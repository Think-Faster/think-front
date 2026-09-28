import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useDataEvent } from '../../core/events/dataEvents';
import { predictionRepository } from '../../entities/prediction/predictionRepository';
import { PredictionListItem, PredictionStatus } from '../../entities/prediction/types';
import { usePagedList } from '../../shared/hooks/usePagedList';
import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import ListFooter from '../../shared/ui/ListFooter';
import SearchField, { matchesSearch } from '../../shared/ui/SearchField';
import { useObjects } from '../objects/hooks/useObjects';
import PredictionFilters from './PredictionFilters';
import { formatProbability, predictionTypeLabels, predictionStatusLabels, probabilityTone } from './predictionLabels';

// «Журнал прогнозов»: новые сверху (BFF сортирует по HourEnd), по 10 штук.
export default function PredictionQueueWindow() {
  const location = useLocation();
  const { objects } = useObjects();
  const [status, setStatus] = useState<PredictionStatus | 'all'>('all');
  const [objectId, setObjectId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');

  const list = usePagedList<PredictionListItem>(
    `${status}:${objectId ?? ''}`,
    query =>
      predictionRepository.getList({ ...query, status: status === 'all' ? undefined : status, objectId }),
    'Не удалось загрузить прогнозы.'
  );

  useDataEvent('prediction.updated', list.reload);

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  const shown = list.items.filter(prediction =>
    matchesSearch(search, objectName(prediction.objectId), prediction.topic, predictionTypeLabels[prediction.type])
  );

  return (
    <>
      <div className="win-search">
        <SearchField value={search} onChange={setSearch} />
      </div>

      <PredictionFilters
        status={status}
        onStatusChange={setStatus}
        objectId={objectId}
        onObjectChange={setObjectId}
      />

      <div className="card-list">
        {list.loading && list.items.length === 0 && <EmptyState>Загрузка…</EmptyState>}
        {list.error && <div className="status-note rej">{list.error}</div>}
        {!list.loading && !list.error && list.items.length === 0 && <EmptyState>Прогнозов пока нет</EmptyState>}
        {search && list.items.length > 0 && shown.length === 0 && (
          <EmptyState>Среди загруженных прогнозов совпадений нет</EmptyState>
        )}

        {shown.map(prediction => {
          const active = location.pathname === `/predictions/${prediction.id}`;
          const tone = probabilityTone(prediction.probability);

          return (
            <Link
              key={prediction.id}
              to={`/predictions/${prediction.id}`}
              className={`queue-item risk-${tone} ${active ? 'active' : ''} ${
                prediction.status !== 'new' ? 'resolved' : ''
              }`}
            >
              <div className="queue-top">
                <span className="queue-obj">
                  {objectName(prediction.objectId)} · {predictionTypeLabels[prediction.type]}
                </span>

                <Badge tone={tone}>{formatProbability(prediction.probability)}</Badge>
              </div>

              <div className="queue-desc">{prediction.topic}</div>

              <div className="queue-meta">
                {predictionStatusLabels[prediction.status]} · {prediction.sinceHours} ч
              </div>
            </Link>
          );
        })}

        <ListFooter count={list.items.length} hasMore={list.hasMore} loading={list.loading} onMore={list.loadMore} />
      </div>
    </>
  );
}

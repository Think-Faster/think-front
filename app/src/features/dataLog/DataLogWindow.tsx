import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { factAlertRepository } from '../../entities/factAlert/factAlertRepository';
import { FactAlert } from '../../entities/factAlert/types';
import { usePagedList } from '../../shared/hooks/usePagedList';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ListFooter from '../../shared/ui/ListFooter';
import SearchField, { matchesSearch } from '../../shared/ui/SearchField';
import { openWindowWithObject, useWindowObject } from '../../stores/workspace/windowScope';
import { showRouteOnMap } from '../map/mapRequest';
import { useObjects } from '../objects/hooks/useObjects';
import { alertGroupLabels, alertGroupTone, factSummary, predictionTypeLabels } from '../predictions/predictionLabels';

// «Журнал данных»: тревоги по факту — что уже сработало на датчиках, в
// отличие от прогнозов. Источник — /fact-alerts, новые сверху. По умолчанию
// показан объект, выбранный на карте; «Все объекты» снимает фильтр.
// Эпизод модель ведёт, пока он идёт: lastAt и подробности растут, у
// проникновения — маршрут, который можно показать на карте.
export default function DataLogWindow() {
  const { objects } = useObjects();
  const [selectedId, setSelectedId] = useWindowObject();
  const [search, setSearch] = useState('');
  // «История объектов» требует objects:read, журнал данных — predictions:read.
  const canOpenHistory = usePermission('objects', 'read');
  const canOpenMap = usePermission('objects', 'read');

  const list = usePagedList<FactAlert>(
    String(selectedId ?? ''),
    query => factAlertRepository.getList({ ...query, objectId: selectedId ?? undefined }),
    'Не удалось загрузить журнал данных.'
  );

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  const shown = list.items.filter(alert =>
    matchesSearch(
      search,
      objectName(alert.objectId),
      predictionTypeLabels[alert.type],
      alertGroupLabels[alert.group],
      alert.status
    )
  );

  function showObject(id: number) {
    setSelectedId(id);
    if (canOpenHistory) {
      openWindowWithObject('objectHistory', id);
    }
  }

  return (
    <>
      <div className="win-search">
        <SearchField value={search} onChange={setSearch} />
      </div>

      <div className="win-toolbar">
        <select
          aria-label="Объект"
          value={selectedId ?? ''}
          onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Все объекты</option>
          {objects.map(object => (
            <option key={object.id} value={object.id}>
              {object.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card-list">
        {list.loading && list.items.length === 0 && <EmptyState>Загрузка…</EmptyState>}
        {list.error && <div className="status-note rej">{list.error}</div>}
        {!list.loading && !list.error && list.items.length === 0 && <EmptyState>Тревог по факту нет</EmptyState>}
        {search && list.items.length > 0 && shown.length === 0 && (
          <EmptyState>Среди загруженных записей совпадений нет</EmptyState>
        )}

        {shown.map(alert => {
          const summary = factSummary(alert);
          const tone = alertGroupTone[alert.group];
          return (
            <div key={alert.id} className={`queue-item risk-${tone}`}>
              <div className="queue-top">
                <button className="queue-obj link-btn" onClick={() => showObject(alert.objectId)}>
                  {objectName(alert.objectId)} · {predictionTypeLabels[alert.type]}
                </button>
                <Badge tone={tone}>{alertGroupLabels[alert.group]}</Badge>
                {alert.live && <Badge tone={tone}>идёт</Badge>}
              </div>

              <div className="queue-desc">
                Началось {new Date(alert.startedAt).toLocaleString('ru-RU')}
                {alert.live ? ', последняя сработка ' : ', закончилось '}
                {new Date(alert.lastAt).toLocaleString('ru-RU')}
              </div>

              {summary && <div className="queue-desc">{summary}</div>}

              <div className="queue-meta">
                Объявлено {new Date(alert.announcedAt).toLocaleString('ru-RU')} · {alert.status}
                {alert.triggerSensorIds.length > 0 && ` · датчики: ${alert.triggerSensorIds.join(', ')}`}
              </div>

              {canOpenMap && alert.route.length > 0 && (
                <div className="queue-actions">
                  <Button onClick={() => showRouteOnMap(alert)}>Показать маршрут на карте</Button>
                </div>
              )}
            </div>
          );
        })}

        <ListFooter count={list.items.length} hasMore={list.hasMore} loading={list.loading} onMore={list.loadMore} />
      </div>
    </>
  );
}

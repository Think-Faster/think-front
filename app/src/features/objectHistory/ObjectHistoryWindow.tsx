import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useDataEvent } from '../../core/events/dataEvents';
import { LIST_PAGE_SIZE } from '../../shared/hooks/usePagedList';
import Badge from '../../shared/ui/Badge';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import ListFooter from '../../shared/ui/ListFooter';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { useObjects } from '../objects/hooks/useObjects';
import { objectStatusLabels } from '../objects/objectLabels';
import { EntryKind, SOURCE_LIMIT, useObjectHistory } from './hooks/useObjectHistory';

const kindLabels: Record<EntryKind, string> = {
  prediction: 'Прогноз',
  incident: 'Происшествие',
  task: 'Заявка',
  factAlert: 'Тревога',
};

const kindOptions: { value: EntryKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Всё' },
  { value: 'prediction', label: 'Прогнозы' },
  { value: 'incident', label: 'Происшествия' },
  { value: 'task', label: 'Заявки' },
  { value: 'factAlert', label: 'Тревоги' },
];

// «История объектов»: всё, что происходило с выбранным объектом, одной
// лентой — прогнозы, происшествия, заявки, тревоги по факту. Объект берётся
// из общего выбора (клик по участку на карте) и меняется здесь же.
export default function ObjectHistoryWindow() {
  const { objects } = useObjects();
  const objectId = useSelectionStore(state => state.objectId);
  const setObjectId = useSelectionStore(state => state.setObjectId);
  const [kind, setKind] = useState<EntryKind | 'all'>('all');
  const [shownCount, setShownCount] = useState(LIST_PAGE_SIZE);

  const history = useObjectHistory(objectId);
  useDataEvent('task.created', history.reload);

  useEffect(() => setShownCount(LIST_PAGE_SIZE), [objectId, kind]);

  const filtered = useMemo(
    () => (kind === 'all' ? history.entries : history.entries.filter(entry => entry.kind === kind)),
    [history.entries, kind]
  );
  const shown = filtered.slice(0, shownCount);
  const object = objects.find(item => item.id === objectId);

  return (
    <>
      <div className="win-toolbar">
        <select
          aria-label="Объект"
          value={objectId ?? ''}
          onChange={event => setObjectId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">— выбрать объект —</option>
          {objects.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {object && <Badge tone={`st-${object.status}`}>{objectStatusLabels[object.status]}</Badge>}
      </div>

      <div className="win-toolbar">
        <ChipFilterGroup options={kindOptions} value={kind} onChange={setKind} />
      </div>

      <div className="card-list">
        {objectId === null && (
          <EmptyState>
            Выберите объект в списке или на{' '}
            <button className="link-btn" onClick={() => openWindow('map')}>
              карте
            </button>
          </EmptyState>
        )}
        {objectId !== null && history.loading && history.entries.length === 0 && <EmptyState>Загрузка…</EmptyState>}
        {history.error && <div className="status-note rej">{history.error}</div>}
        {objectId !== null && !history.loading && !history.error && filtered.length === 0 && (
          <EmptyState>По объекту записей нет</EmptyState>
        )}

        {shown.map(entry => {
          const body = (
            <>
              <div className="queue-top">
                <span className="queue-obj">
                  {kindLabels[entry.kind]} · {new Date(entry.at).toLocaleString('ru-RU')}
                </span>
                <Badge tone={entry.tone}>{entry.badge}</Badge>
              </div>
              <div className="queue-desc">{entry.title}</div>
              {entry.meta && <div className="queue-meta">{entry.meta}</div>}
            </>
          );

          return entry.to ? (
            <Link key={entry.key} to={entry.to} className="queue-item">
              {body}
            </Link>
          ) : (
            <div key={entry.key} className="queue-item">
              {body}
            </div>
          );
        })}

        {objectId !== null && (
          <ListFooter
            count={shown.length}
            hasMore={shown.length < filtered.length}
            loading={false}
            onMore={() => setShownCount(count => count + LIST_PAGE_SIZE)}
          />
        )}

        {history.truncated && shown.length >= filtered.length && filtered.length > 0 && (
          <div className="queue-meta">Показаны последние {SOURCE_LIMIT} записей каждого вида</div>
        )}
      </div>
    </>
  );
}

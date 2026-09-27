import { useMemo, useState } from 'react';

import { MonitoredObject } from '../../entities/object/types';
import { Reading } from '../../entities/reading/types';
import Badge from '../../shared/ui/Badge';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import ListFooter from '../../shared/ui/ListFooter';
import SearchField, { matchesSearch } from '../../shared/ui/SearchField';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { useObjects } from '../objects/hooks/useObjects';
import { useReadingsScope } from './hooks/useReadingsScope';
import { StreamState, useReadingsStream } from './hooks/useReadingsStream';
import { SENSOR_NAME_OBJECTS, useSensorNames } from './hooks/useSensorNames';

type Filter = 'all' | 'alarm';

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все показания' },
  { value: 'alarm', label: 'Тревожные' },
];

const stateLabels: Record<StreamState, string> = {
  idle: '',
  loading: 'Загрузка…',
  live: 'В эфире',
  reconnecting: 'Нет связи — переподключаюсь',
  error: 'Поток остановлен',
};

function subtree(objects: MonitoredObject[], roots: number[]): number[] {
  const children = new Map<number, number[]>();
  for (const object of objects) {
    if (object.parentId !== null) {
      children.set(object.parentId, [...(children.get(object.parentId) ?? []), object.id]);
    }
  }
  const result = new Set<number>();
  const stack = [...roots];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (!result.has(id)) {
      result.add(id);
      stack.push(...(children.get(id) ?? []));
    }
  }
  return Array.from(result);
}

function formatMoment(reading: Reading, today: string): string {
  const [year, month, day] = reading.date.split('-');
  return reading.date === today ? reading.time : `${day}.${month}.${year.slice(2)} ${reading.time}`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// «Логи»: показания датчиков объекта — живой поток и архив воронки. Объект
// берётся из общего выбора (карта, карточка заявки) и меняется здесь же.
// Диспетчер и администратор видят любой объект; инженер — объекты заявок,
// по которым работает, пока заявка не закрыта отчётом.
export default function LogsWindow() {
  const { objects } = useObjects();
  const selectedId = useSelectionStore(state => state.objectId);
  const setSelectedId = useSelectionStore(state => state.setObjectId);
  const { scope, error: scopeError } = useReadingsScope();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const all = scope?.all ?? false;
  const mine = useMemo(() => (scope && !scope.all ? scope.objectIds : []), [scope]);
  const objectId = selectedId ?? undefined;
  // Без выбранного объекта инженер смотрит все свои заявки сразу; диспетчеру
  // весь район одним потоком не нужен — он выбирает объект.
  const active = scope !== null && (objectId !== undefined || mine.length > 0);
  const stream = useReadingsStream(objectId, active);

  const choices = useMemo(() => {
    const list = all ? objects : objects.filter(object => mine.includes(object.id));
    const selected = objects.find(object => object.id === selectedId);
    return selected && !list.includes(selected) ? [...list, selected] : list;
  }, [all, objects, mine, selectedId]);

  const info = stream.info;
  const covered = useMemo(
    () => subtree(objects, info?.objectIds ?? (objectId !== undefined ? [objectId] : mine)),
    [objects, info, objectId, mine]
  );
  const names = useSensorNames(covered);

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
  const silentCount = Object.keys(stream.silent).length;

  const rows = stream.items.filter(
    reading =>
      (filter === 'all' || reading.alarm) &&
      matchesSearch(search, names.get(reading.sensorId) ?? '', String(reading.sensorId), reading.value)
  );

  return (
    <>
      <div className="win-toolbar">
        <select
          aria-label="Объект"
          value={selectedId ?? ''}
          onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">{all || mine.length === 0 ? '— выбрать объект —' : 'Все объекты моих заявок'}</option>
          {choices.map(object => (
            <option key={object.id} value={object.id}>
              {object.name}
            </option>
          ))}
        </select>

        {stream.state !== 'idle' && (
          <span className={`log-state ${stream.state}`} role="status">
            {stateLabels[stream.state]}
            {stream.state === 'live' && stream.info && ` · датчиков ${stream.info.sensors}`}
          </span>
        )}
      </div>

      <div className="win-toolbar">
        <ChipFilterGroup options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      <div className="win-search">
        <SearchField value={search} onChange={setSearch} />
      </div>

      {scopeError && <div className="status-note rej log-note">{scopeError}</div>}
      {stream.error && (
        <div className="status-note rej log-note">
          {stream.error}{' '}
          <button className="link-btn" onClick={stream.reload}>
            Повторить
          </button>
        </div>
      )}
      {silentCount > 0 && (
        <div className="status-note rej log-note">
          Молчат каналов: {silentCount} — с{' '}
          {formatClock(Object.values(stream.silent).sort()[0])}
        </div>
      )}
      {stream.dropped > 0 && (
        <div className="status-note rej log-note">
          Поток шёл быстрее, чем успевал экран: пропущено {stream.dropped}, они есть в архиве
        </div>
      )}

      <div className="log-list">
        {scope && !active && (
          <EmptyState>
            {all ? (
              <>
                Выберите объект в списке или на{' '}
                <button className="link-btn" onClick={() => openWindow('map')}>
                  карте
                </button>
              </>
            ) : (
              'Нет заявок в работе — показания смотреть не по чему'
            )}
          </EmptyState>
        )}
        {stream.state === 'loading' && <EmptyState>Загрузка…</EmptyState>}
        {active && stream.state !== 'loading' && !stream.error && stream.items.length === 0 && (
          <EmptyState>За последние сутки показаний нет — новые появятся здесь сами</EmptyState>
        )}
        {search && stream.items.length > 0 && rows.length === 0 && <EmptyState>Совпадений нет</EmptyState>}

        {rows.map(reading => (
          <div
            key={`${reading.sensorId}:${reading.eventId}`}
            className={`log-row${reading.alarm ? ' alarm' : ''}${stream.silent[reading.sensorId] ? ' silent' : ''}`}
          >
            <span className="log-time" title={`Принято ${new Date(reading.receivedAt).toLocaleString('ru-RU')}`}>
              {formatMoment(reading, today)}
            </span>
            <span className="log-sensor" title={`Канал ${reading.sensorId}`}>
              {names.get(reading.sensorId) ?? `Канал ${reading.sensorId}`}
            </span>
            <span className="log-value">{reading.value}</span>
            {reading.alarm && <Badge tone="high">тревога</Badge>}
          </div>
        ))}

        {covered.length > SENSOR_NAME_OBJECTS && stream.items.length > 0 && (
          <div className="queue-meta">Объектов много — датчики показаны номерами каналов</div>
        )}

        <ListFooter
          count={stream.items.length}
          hasMore={stream.more}
          loading={stream.loadingOlder}
          onMore={() => void stream.loadOlder()}
        />
      </div>
    </>
  );
}

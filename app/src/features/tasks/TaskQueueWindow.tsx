import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useDataEvent } from '../../core/events/dataEvents';
import { usePermission } from '../../core/permissions/permissionService';
import { taskRepository } from '../../entities/task/taskRepository';
import { WorkTaskListItem, WorkTaskStatus } from '../../entities/task/types';
import { usePagedList } from '../../shared/hooks/usePagedList';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import ListFooter from '../../shared/ui/ListFooter';
import SearchField, { matchesSearch } from '../../shared/ui/SearchField';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { useObjects } from '../objects/hooks/useObjects';
import { taskSourceTypeLabels, taskStatusFilterOptions, taskStatusLabels, taskStatusTone } from './taskLabels';

// «Дневник диспетчера»: заявки, новые сверху (BFF сортирует по CreatedAt).
// Создание вынесено в отдельное окно «Создать заявку» — кнопка здесь его
// открывает, а после создания дневник перечитывается по событию.
export default function TaskQueueWindow() {
  const location = useLocation();
  const { objects } = useObjects();
  const canCreate = usePermission('tasks', 'create');
  const [status, setStatus] = useState<WorkTaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const list = usePagedList<WorkTaskListItem>(
    status,
    query => taskRepository.getList({ ...query, status: status === 'all' ? undefined : status }),
    'Не удалось загрузить заявки.'
  );

  useDataEvent('task.created', list.reload);

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  const shown = list.items.filter(task => matchesSearch(search, task.number, task.topic, objectName(task.objectId)));

  return (
    <>
      <div className="win-search">
        <SearchField value={search} onChange={setSearch} />
        {canCreate && (
          <Button variant="primary" onClick={() => openWindow('taskCreate')}>
            Создать заявку
          </Button>
        )}
      </div>

      <div className="win-toolbar">
        <ChipFilterGroup options={taskStatusFilterOptions} value={status} onChange={setStatus} />
      </div>

      <div className="card-list">
        {list.loading && list.items.length === 0 && <EmptyState>Загрузка…</EmptyState>}
        {list.error && <div className="status-note rej">{list.error}</div>}
        {!list.loading && !list.error && list.items.length === 0 && <EmptyState>Заявок пока нет</EmptyState>}
        {search && list.items.length > 0 && shown.length === 0 && (
          <EmptyState>Среди загруженных заявок совпадений нет</EmptyState>
        )}

        {shown.map(task => {
          const active = location.pathname === `/tasks/${task.id}`;
          const resolved = task.status === 'completed' || task.status === 'closed' || task.status === 'cancelled';

          return (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className={`queue-item ${active ? 'active' : ''} ${resolved ? 'resolved' : ''}`}
            >
              <div className="queue-top">
                <span className="queue-obj">
                  №{task.number} · {objectName(task.objectId)}
                </span>

                <Badge tone={taskStatusTone(task.status)}>{taskStatusLabels[task.status]}</Badge>
              </div>

              <div className="queue-desc">{task.topic}</div>
              <div className="queue-meta">
                {taskSourceTypeLabels[task.sourceType]} · {new Date(task.createdAt).toLocaleString('ru-RU')}
              </div>
            </Link>
          );
        })}

        <ListFooter count={list.items.length} hasMore={list.hasMore} loading={list.loading} onMore={list.loadMore} />
      </div>
    </>
  );
}

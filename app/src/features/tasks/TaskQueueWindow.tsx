import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { usePermission } from '../../core/permissions/permissionService';
import { TaskSourceType } from '../../entities/task/types';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useObjects } from '../objects/hooks/useObjects';
import { useCreateTask } from './hooks/useCreateTask';
import { useTasks } from './hooks/useTasks';
import {
  taskSourceTypeLabels,
  taskSourceTypeOptions,
  taskStatusFilterOptions,
  taskStatusLabels,
  taskStatusTone,
} from './taskLabels';

const emptyForm = {
  number: '',
  sourceType: 'call' as TaskSourceType,
  objectId: '',
  topic: '',
  description: '',
  workType: '',
  faultClassification: '',
  priority: '3',
};

export default function TaskQueueWindow() {
  const location = useLocation();
  const { objects } = useObjects();
  const { tasks, loading, error, status, setStatus, reload } = useTasks();
  const { createTask, loading: creating, error: createError } = useCreateTask();
  const canCreate = usePermission('tasks', 'create');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createTask({
      number: form.number,
      sourceType: form.sourceType,
      objectId: Number(form.objectId),
      topic: form.topic,
      description: form.description || null,
      workType: form.workType || null,
      faultClassification: form.faultClassification || null,
      priority: Number(form.priority),
    });

    if (created) {
      setForm(emptyForm);
      setShowCreate(false);
      reload();
    }
  }

  return (
    <>
      <div className="win-toolbar">
        <ChipFilterGroup options={taskStatusFilterOptions} value={status} onChange={setStatus} />
      </div>

      <div>
        {loading && <EmptyState>Загрузка…</EmptyState>}
        {error && <div className="status-note rej">{error}</div>}
        {!loading && !error && tasks.length === 0 && <EmptyState>Заявок пока нет</EmptyState>}

        {tasks.map(task => {
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
              <div className="queue-meta">{taskSourceTypeLabels[task.sourceType]}</div>
            </Link>
          );
        })}
      </div>

      {canCreate && (
        <div className="pd-body">
          {!showCreate ? (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Добавить заявку
            </Button>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Номер
                <input value={form.number} onChange={setField('number')} disabled={creating} required />
              </label>

              <label>
                Источник
                <ChipFilterGroup
                  options={taskSourceTypeOptions}
                  value={form.sourceType}
                  onChange={value => setForm(current => ({ ...current, sourceType: value }))}
                />
              </label>

              <label>
                Объект
                <select value={form.objectId} onChange={setField('objectId')} disabled={creating} required>
                  <option value="">— выбрать —</option>
                  {objects.map(object => (
                    <option key={object.id} value={object.id}>
                      {object.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Тема
                <input value={form.topic} onChange={setField('topic')} disabled={creating} required />
              </label>

              <label>
                Описание
                <input value={form.description} onChange={setField('description')} disabled={creating} />
              </label>

              <label>
                Вид работ
                <input value={form.workType} onChange={setField('workType')} disabled={creating} />
              </label>

              <label>
                Классификация неисправности
                <input
                  value={form.faultClassification}
                  onChange={setField('faultClassification')}
                  disabled={creating}
                />
              </label>

              <label>
                Приоритет
                <input
                  type="number"
                  value={form.priority}
                  onChange={setField('priority')}
                  disabled={creating}
                  required
                />
              </label>

              {createError && <div className="login-error">{createError}</div>}

              <div className="pd-actions">
                <Button type="button" onClick={() => setShowCreate(false)} disabled={creating}>
                  Отмена
                </Button>

                <Button type="submit" variant="primary" disabled={creating}>
                  {creating ? 'Создание…' : 'Добавить заявку'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}

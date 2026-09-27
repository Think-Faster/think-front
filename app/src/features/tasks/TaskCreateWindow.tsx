import { ChangeEvent, FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { emitDataEvent } from '../../core/events/dataEvents';
import { TaskSourceType } from '../../entities/task/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { closeWindow } from '../../stores/workspace/workspaceCommands';
import { useObjects } from '../objects/hooks/useObjects';
import { useCreateTask } from './hooks/useCreateTask';
import { taskSourceTypeOptions } from './taskLabels';

function emptyForm(objectId: number | null) {
  return {
    number: '',
    sourceType: 'call' as TaskSourceType,
    objectId: objectId === null ? '' : String(objectId),
    topic: '',
    description: '',
    workType: '',
    faultClassification: '',
    priority: '3',
  };
}

type FormState = ReturnType<typeof emptyForm>;

// «Создать заявку» — кнопка-действие сайдбара. Объект подставляется из
// выбранного на карте. После создания окно закрывается, открывается карточка
// новой заявки, «Дневник диспетчера» перечитывается.
export default function TaskCreateWindow() {
  const navigate = useNavigate();
  const { objects } = useObjects();
  const selectedObjectId = useSelectionStore(state => state.objectId);
  const { createTask, loading: creating, error } = useCreateTask();
  const [form, setForm] = useState<FormState>(() => emptyForm(selectedObjectId));

  function setField(field: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
      emitDataEvent('task.created');
      closeWindow('taskCreate');
      navigate(`/tasks/${created.id}`);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <label>
        Номер
        <input value={form.number} onChange={setField('number')} disabled={creating} required />
      </label>

      <div className="form-field">
        <span>Источник</span>
        <ChipFilterGroup
          options={taskSourceTypeOptions}
          value={form.sourceType}
          onChange={value => setForm(current => ({ ...current, sourceType: value }))}
        />
      </div>

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
        <textarea rows={3} value={form.description} onChange={setField('description')} disabled={creating} />
      </label>

      <label>
        Вид работ
        <input value={form.workType} onChange={setField('workType')} disabled={creating} />
      </label>

      <label>
        Классификация неисправности
        <input value={form.faultClassification} onChange={setField('faultClassification')} disabled={creating} />
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

      {error && <div className="login-error">{error}</div>}

      <div className="pd-actions">
        <Button type="button" onClick={() => closeWindow('taskCreate')} disabled={creating}>
          Отмена
        </Button>

        <Button type="submit" variant="primary" disabled={creating}>
          {creating ? 'Создание…' : 'Создать заявку'}
        </Button>
      </div>
    </form>
  );
}

import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { Sensor } from '../../entities/sensor/types';
import { useObjects } from '../objects/hooks/useObjects';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useCreateSensor } from './hooks/useCreateSensor';
import { useSensors } from './hooks/useSensors';
import SensorEditForm from './SensorEditForm';

const emptyForm = {
  id: '',
  objectId: '',
  picketId: '',
  system: '',
  sType: '',
  tag: '',
  name: '',
};

export default function SensorsPanel() {
  const { objects } = useObjects();
  const [objectFilter, setObjectFilter] = useState('');
  const { sensors, loading, error, reload } = useSensors(objectFilter ? Number(objectFilter) : undefined);
  const { createSensor, loading: creating, error: createError } = useCreateSensor();
  const canCreate = usePermission('sensors', 'create');
  const canEdit = usePermission('sensors', 'update');

  const [form, setForm] = useState(emptyForm);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  function objectName(objectId: number): string {
    const object = objects.find(item => item.id === objectId);
    return object ? object.name : `#${objectId}`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createSensor({
      id: Number(form.id),
      objectId: Number(form.objectId),
      picketId: form.picketId || null,
      system: form.system,
      sType: form.sType,
      tag: form.tag || null,
      name: form.name,
    });

    if (created) {
      setForm(emptyForm);
      reload();
    }
  }

  return (
    <div className="pd-body">
      <p className="pd-section-title">Датчики</p>

      <div className="win-toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Объект
          <select value={objectFilter} onChange={event => setObjectFilter(event.target.value)}>
            <option value="">— все —</option>
            {objects.map(object => (
              <option key={object.id} value={object.id}>
                {object.name} (#{object.id})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && sensors.length === 0 && <EmptyState>Датчиков пока нет</EmptyState>}

      {sensors.map(sensor => (
        <div className="hist-item" key={sensor.id}>
          <div>
            <div>{sensor.name}</div>
            <div className="d">
              #{sensor.id} · {objectName(sensor.objectId)} · {sensor.system}/{sensor.sType}
              {!sensor.isActive ? ' · неактивен' : ''}
            </div>
          </div>

          {canEdit && (
            <button className="chip-filter" onClick={() => setEditingSensor(sensor)}>
              Изменить
            </button>
          )}
        </div>
      ))}

      {editingSensor ? (
        <>
          <p className="pd-section-title">Редактировать датчик</p>

          <SensorEditForm
            sensor={editingSensor}
            onCancel={() => setEditingSensor(null)}
            onSaved={() => {
              setEditingSensor(null);
              reload();
            }}
          />
        </>
      ) : (
        canCreate && (
          <>
            <p className="pd-section-title">Добавить датчик</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                ID (внешний, "ид_канала_данных")
                <input value={form.id} onChange={setField('id')} type="number" disabled={creating} required />
              </label>

              <label>
                Объект
                <select value={form.objectId} onChange={setField('objectId')} disabled={creating} required>
                  <option value="">— выбрать —</option>
                  {objects.map(object => (
                    <option key={object.id} value={object.id}>
                      {object.name} (#{object.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                ID пикета (опционально)
                <input value={form.picketId} onChange={setField('picketId')} disabled={creating} />
              </label>

              <label>
                Система
                <input value={form.system} onChange={setField('system')} disabled={creating} required />
              </label>

              <label>
                Тип
                <input value={form.sType} onChange={setField('sType')} disabled={creating} required />
              </label>

              <label>
                Тег
                <input value={form.tag} onChange={setField('tag')} disabled={creating} />
              </label>

              <label>
                Название
                <input value={form.name} onChange={setField('name')} disabled={creating} required />
              </label>

              {createError && <div className="login-error">{createError}</div>}

              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? 'Создание…' : 'Добавить датчик'}
              </Button>
            </form>
          </>
        )
      )}
    </div>
  );
}

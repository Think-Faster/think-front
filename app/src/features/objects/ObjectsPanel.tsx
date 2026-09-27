import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { MonitoredObject } from '../../entities/object/types';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useCreateObject } from './hooks/useCreateObject';
import { useObjects } from './hooks/useObjects';
import ObjectEditForm from './ObjectEditForm';
import { objectStatusLabels } from './objectLabels';

const emptyForm = {
  id: '',
  level: '',
  parentId: '',
  kind: '',
  name: '',
  address: '',
  geometryGeoJson: '',
};

export default function ObjectsPanel() {
  const { objects, loading, error, reload } = useObjects();
  const { createObject, loading: creating, error: createError } = useCreateObject();
  const canCreate = usePermission('objects', 'create');
  const canEdit = usePermission('objects', 'update');

  const [form, setForm] = useState(emptyForm);
  const [editingObject, setEditingObject] = useState<MonitoredObject | null>(null);

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createObject({
      id: Number(form.id),
      level: Number(form.level),
      parentId: form.parentId ? Number(form.parentId) : null,
      kind: form.kind,
      name: form.name,
      address: form.address || null,
      geometryGeoJson: form.geometryGeoJson || null,
    });

    if (created) {
      setForm(emptyForm);
      reload();
    }
  }

  return (
    <div className="pd-body">
      <p className="pd-section-title">Объекты</p>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && objects.length === 0 && <EmptyState>Объектов пока нет</EmptyState>}

      {objects.map(object => (
        <div className="hist-item" key={object.id}>
          <div>
            <div>{object.name}</div>
            <div className="d">
              #{object.id} · {object.kind} · {objectStatusLabels[object.status] ?? object.status}
            </div>
          </div>

          {canEdit && (
            <button className="chip-filter" onClick={() => setEditingObject(object)}>
              Изменить
            </button>
          )}
        </div>
      ))}

      {editingObject ? (
        <>
          <p className="pd-section-title">Редактировать объект</p>

          <ObjectEditForm
            object={editingObject}
            onCancel={() => setEditingObject(null)}
            onSaved={() => {
              setEditingObject(null);
              reload();
            }}
          />
        </>
      ) : (
        canCreate && (
          <>
            <p className="pd-section-title">Добавить объект</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                ID (внешний, из справочника мониторинга)
                <input value={form.id} onChange={setField('id')} type="number" disabled={creating} required />
              </label>

              <label>
                Уровень
                <input value={form.level} onChange={setField('level')} type="number" disabled={creating} required />
              </label>

              <label>
                Родительский объект
                <select value={form.parentId} onChange={setField('parentId')} disabled={creating}>
                  <option value="">— нет —</option>
                  {objects.map(object => (
                    <option key={object.id} value={object.id}>
                      {object.name} (#{object.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Тип
                <input value={form.kind} onChange={setField('kind')} disabled={creating} required />
              </label>

              <label>
                Название
                <input value={form.name} onChange={setField('name')} disabled={creating} required />
              </label>

              <label>
                Адрес
                <input value={form.address} onChange={setField('address')} disabled={creating} />
              </label>

              <label>
                Геометрия (GeoJSON)
                <textarea
                  value={form.geometryGeoJson}
                  onChange={setField('geometryGeoJson')}
                  disabled={creating}
                  rows={3}
                />
              </label>

              {createError && <div className="login-error">{createError}</div>}

              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? 'Создание…' : 'Добавить объект'}
              </Button>
            </form>
          </>
        )
      )}
    </div>
  );
}

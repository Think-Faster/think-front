import { ChangeEvent, FormEvent, useState } from 'react';

import { MonitoredObject } from '../../entities/object/types';
import Button from '../../shared/ui/Button';
import { useUpdateObject } from './hooks/useUpdateObject';

interface ObjectEditFormProps {
  object: MonitoredObject;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ObjectEditForm({ object, onSaved, onCancel }: ObjectEditFormProps) {
  const { updateObject, loading, error } = useUpdateObject();

  const [form, setForm] = useState({
    name: object.name,
    address: object.address ?? '',
    geometryGeoJson: object.geometryGeoJson ?? '',
  });

  function setField(field: keyof typeof form) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const updated = await updateObject(object.id, {
      name: form.name,
      address: form.address || null,
      geometryGeoJson: form.geometryGeoJson || null,
    });

    if (updated) {
      onSaved();
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Название
        <input value={form.name} onChange={setField('name')} disabled={loading} required />
      </label>

      <label>
        Адрес
        <input value={form.address} onChange={setField('address')} disabled={loading} />
      </label>

      <label>
        Геометрия (GeoJSON)
        <textarea value={form.geometryGeoJson} onChange={setField('geometryGeoJson')} disabled={loading} rows={3} />
      </label>

      {error && <div className="login-error">{error}</div>}

      <div className="pd-actions">
        <Button type="button" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}

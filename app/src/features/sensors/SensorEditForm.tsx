import { ChangeEvent, FormEvent, useState } from 'react';

import { Sensor } from '../../entities/sensor/types';
import Button from '../../shared/ui/Button';
import { useUpdateSensor } from './hooks/useUpdateSensor';

interface SensorEditFormProps {
  sensor: Sensor;
  onSaved: () => void;
  onCancel: () => void;
}

export default function SensorEditForm({ sensor, onSaved, onCancel }: SensorEditFormProps) {
  const { updateSensor, loading, error } = useUpdateSensor();

  const [form, setForm] = useState({
    name: sensor.name,
    tag: sensor.tag ?? '',
    picketId: sensor.picketId ?? '',
    isActive: sensor.isActive,
  });

  function setField(field: 'name' | 'tag' | 'picketId') {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const updated = await updateSensor(sensor.id, {
      name: form.name,
      tag: form.tag || null,
      picketId: form.picketId || null,
      isActive: form.isActive,
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
        Тег
        <input value={form.tag} onChange={setField('tag')} disabled={loading} />
      </label>

      <label>
        ID пикета
        <input value={form.picketId} onChange={setField('picketId')} disabled={loading} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
          disabled={loading}
        />
        Активен
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

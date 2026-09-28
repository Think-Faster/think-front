import { FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { IgnoredRangeScope } from '../../entities/ignoredRange/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useObjects } from '../objects/hooks/useObjects';
import { useSensors } from '../sensors/hooks/useSensors';
import { useIgnoredRanges } from './hooks/useIgnoredRanges';
import { ignoredRangeScopeLabels, ignoredRangeScopeOptions } from './modelSettingsLabels';

const emptyForm = {
  scope: 'all' as IgnoredRangeScope,
  objectId: '',
  sensorId: '',
  dateFrom: '',
  dateTo: '',
  reason: '',
};

export default function IgnoredRangesTab() {
  const { ranges, loading, error, createRange, removeRange, acting, actionError } = useIgnoredRanges();
  const canManage = usePermission('model_settings', 'manage');

  const [form, setForm] = useState(emptyForm);
  const { objects } = useObjects();
  // Датчик выбирается внутри объекта: сначала объект, потом его датчик.
  const { sensors } = useSensors(form.objectId ? Number(form.objectId) : undefined);

  function objectName(id: number): string {
    return objects.find(object => object.id === id)?.name ?? `#${id}`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createRange({
      scope: form.scope,
      objectId: form.scope === 'object' && form.objectId ? Number(form.objectId) : null,
      sensorId: form.scope === 'sensor' && form.sensorId ? Number(form.sensorId) : null,
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      reason: form.reason,
    });

    if (created) {
      setForm(emptyForm);
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && ranges.length === 0 && <EmptyState>Игнорируемых диапазонов нет</EmptyState>}

      {ranges.map(range => (
        <div className="hist-item" key={range.id}>
          <div>
            <div>
              {ignoredRangeScopeLabels[range.scope]}
              {range.objectId ? ` · ${objectName(range.objectId)}` : ''}
              {range.sensorId ? ` · датчик #${range.sensorId}` : ''}
            </div>
            <div className="d">
              {range.dateFrom} — {range.dateTo} · {range.reason}
            </div>
          </div>

          {canManage && (
            <button className="win-close" onClick={() => removeRange(range.id)} title="Удалить">
              ×
            </button>
          )}
        </div>
      ))}

      {actionError && <div className="login-error">{actionError}</div>}

      {canManage && (
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Область
            <ChipFilterGroup
              options={ignoredRangeScopeOptions}
              value={form.scope}
              onChange={value => setForm(current => ({ ...current, scope: value }))}
            />
          </label>

          {(form.scope === 'object' || form.scope === 'sensor') && (
            <label>
              Объект
              <select
                value={form.objectId}
                onChange={event => setForm(current => ({ ...current, objectId: event.target.value, sensorId: '' }))}
                disabled={acting}
                required
              >
                <option value="">— выбрать —</option>
                {objects.map(object => (
                  <option key={object.id} value={object.id}>
                    {object.name} (#{object.id})
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.scope === 'sensor' && (
            <label>
              Датчик
              <select
                value={form.sensorId}
                onChange={event => setForm(current => ({ ...current, sensorId: event.target.value }))}
                disabled={acting || !form.objectId}
                required
              >
                <option value="">{form.objectId ? '— выбрать —' : '— сначала объект —'}</option>
                {form.objectId &&
                  sensors.map(sensor => (
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.name} (#{sensor.id})
                    </option>
                  ))}
              </select>
            </label>
          )}

          <label>
            С
            <input
              type="date"
              value={form.dateFrom}
              onChange={event => setForm(current => ({ ...current, dateFrom: event.target.value }))}
              disabled={acting}
              required
            />
          </label>

          <label>
            По
            <input
              type="date"
              value={form.dateTo}
              onChange={event => setForm(current => ({ ...current, dateTo: event.target.value }))}
              disabled={acting}
              required
            />
          </label>

          <label>
            Причина
            <input
              value={form.reason}
              onChange={event => setForm(current => ({ ...current, reason: event.target.value }))}
              disabled={acting}
              required
            />
          </label>

          <Button type="submit" variant="primary" disabled={acting}>
            {acting ? 'Сохранение…' : 'Добавить диапазон'}
          </Button>
        </form>
      )}
    </div>
  );
}

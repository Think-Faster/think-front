import { FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { PredictionType } from '../../entities/prediction/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useCoefficients } from './hooks/useCoefficients';
import { coefficientTypeLabels, coefficientTypeOptions } from './modelSettingsLabels';

const emptyForm = { type: 'fire' as PredictionType, share: '', rejectK: '', reason: '' };

export default function CoefficientsTab() {
  const { coefficients, loading, error, createCoefficient, creating, createError } = useCoefficients();
  const canManage = usePermission('model_settings', 'manage');

  const [form, setForm] = useState(emptyForm);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createCoefficient({
      type: form.type,
      share: Number(form.share),
      rejectK: form.rejectK ? Number(form.rejectK) : null,
      reason: form.reason || null,
    });

    if (created) {
      setForm(emptyForm);
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && coefficients.length === 0 && <EmptyState>Коэффициентов пока нет</EmptyState>}

      {coefficients.map(coefficient => (
        <div className="hist-item" key={coefficient.id}>
          <div>
            <div>
              {coefficientTypeLabels[coefficient.type]} · v{coefficient.version}
            </div>
            <div className="d">
              доля {Math.round(coefficient.share * 100)}%
              {coefficient.rejectK !== null ? ` · rejectK ${coefficient.rejectK}` : ''}
              {coefficient.reason ? ` · ${coefficient.reason}` : ''}
            </div>
          </div>
        </div>
      ))}

      {canManage && (
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Тип
            <ChipFilterGroup
              options={coefficientTypeOptions}
              value={form.type}
              onChange={value => setForm(current => ({ ...current, type: value }))}
            />
          </label>

          <label>
            Доля (0..1)
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.share}
              onChange={event => setForm(current => ({ ...current, share: event.target.value }))}
              disabled={creating}
              required
            />
          </label>

          <label>
            rejectK
            <input
              type="number"
              step="0.01"
              value={form.rejectK}
              onChange={event => setForm(current => ({ ...current, rejectK: event.target.value }))}
              disabled={creating}
            />
          </label>

          <label>
            Причина
            <input
              value={form.reason}
              onChange={event => setForm(current => ({ ...current, reason: event.target.value }))}
              disabled={creating}
            />
          </label>

          {createError && <div className="login-error">{createError}</div>}

          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? 'Сохранение…' : 'Сохранить новую версию'}
          </Button>
        </form>
      )}
    </div>
  );
}

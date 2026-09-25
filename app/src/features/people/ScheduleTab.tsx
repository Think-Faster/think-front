import { FormEvent, useState } from 'react';

import { formatBffErrorMessage } from '../../core/errors/bffError';
import { usePermission } from '../../core/permissions/permissionService';
import { scheduleRepository } from '../../entities/schedule/scheduleRepository';
import { ScheduleEntry, ScheduleStatus } from '../../entities/schedule/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useSchedule } from './hooks/useSchedule';
import { scheduleStatusLabels, scheduleStatusOptions } from './peopleLabels';

interface ScheduleTabProps {
  userId: string;
}

const emptyForm = { dateFrom: '', dateTo: '', status: 'working' as ScheduleStatus, source: '' };

export default function ScheduleTab({ userId }: ScheduleTabProps) {
  const { entries, loading, error, reload } = useSchedule(userId);
  const canManage = usePermission('schedule', 'update');

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      await scheduleRepository.create(userId, {
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        status: form.status,
        source: form.source || null,
      });

      setForm(emptyForm);
      reload();
    } catch (err) {
      setSaveError(formatBffErrorMessage(err, 'Не удалось сохранить запись графика.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(entry: ScheduleEntry) {
    setSaveError('');

    try {
      await scheduleRepository.remove(userId, entry.id);
      reload();
    } catch (err) {
      setSaveError(formatBffErrorMessage(err, 'Не удалось удалить запись графика.'));
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && entries.length === 0 && <EmptyState>Записей графика нет</EmptyState>}

      {entries.map(entry => (
        <div className="hist-item" key={entry.id}>
          <div>
            <div>
              {entry.dateFrom} — {entry.dateTo}
            </div>
            <div className="d">
              {scheduleStatusLabels[entry.status]}
              {entry.source ? ` · ${entry.source}` : ''}
            </div>
          </div>

          {canManage && (
            <button className="win-close" onClick={() => handleRemove(entry)} title="Удалить">
              ×
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            С
            <input
              type="date"
              value={form.dateFrom}
              onChange={event => setForm(current => ({ ...current, dateFrom: event.target.value }))}
              disabled={saving}
              required
            />
          </label>

          <label>
            По
            <input
              type="date"
              value={form.dateTo}
              onChange={event => setForm(current => ({ ...current, dateTo: event.target.value }))}
              disabled={saving}
              required
            />
          </label>

          <label>
            Статус
            <ChipFilterGroup
              options={scheduleStatusOptions}
              value={form.status}
              onChange={value => setForm(current => ({ ...current, status: value }))}
            />
          </label>

          <label>
            Источник
            <input
              value={form.source}
              onChange={event => setForm(current => ({ ...current, source: event.target.value }))}
              disabled={saving}
            />
          </label>

          {saveError && <div className="login-error">{saveError}</div>}

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Сохранение…' : 'Добавить запись'}
          </Button>
        </form>
      )}
    </div>
  );
}

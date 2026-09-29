import { FormEvent, useEffect, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { modelControlRepository } from '../../entities/modelControl/modelControlRepository';
import { IgnoredPeriod, ModelStatus } from '../../entities/modelControl/types';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { ModelCommandSender } from './hooks/useModelStatus';

interface Props {
  status: ModelStatus;
  send: ModelCommandSender;
  acting: boolean;
}

const emptyRow = { a: '', b: '', comment: '' };

// <input type="datetime-local"> отдаёт «ГГГГ-ММ-ДДTЧЧ:ММ», модель ждёт «ГГГГ-ММ-ДД ЧЧ:ММ» по Москве.
function toModelTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

function samePeriods(left: IgnoredPeriod[], right: IgnoredPeriod[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// Игнорируемые периоды (§1.5): брак данных всего парка — часы, которые модель не учитывает в порогах и
// при переобучении. Таблица правится целиком и уходит одним снимком со следующим номером версии.
export default function IgnoredPeriodsTab({ status, send, acting }: Props) {
  const canManage = usePermission('model_settings', 'manage');
  const [rows, setRows] = useState<IgnoredPeriod[]>(status.gaps.rows);
  const [form, setForm] = useState(emptyRow);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setRows(status.gaps.rows);
  }, [status]);

  const formError = form.a && form.b && form.a >= form.b ? 'Начало должно быть раньше конца.' : '';
  const changed = !samePeriods(rows, status.gaps.rows);

  function handleAdd(event: FormEvent) {
    event.preventDefault();

    if (formError) {
      return;
    }

    const row = { a: toModelTime(form.a), b: toModelTime(form.b), comment: form.comment.trim() };
    setRows(current => [...current, row].sort((x, y) => x.a.localeCompare(y.a)));
    setForm(emptyRow);
  }

  async function handleSave() {
    const version = status.gaps.version + 1;
    const sent = await send(
      () => modelControlRepository.setGaps(version, reason.trim(), rows),
      next => next.gaps.version >= version
    );

    if (sent) {
      setReason('');
    }
  }

  return (
    <div>
      <div className="form-hint">
        Версия {status.gaps.version}. Время — московское. После правки модель убирает эти часы из истории
        порогов и отмечает, что нужно переобучение.
      </div>

      {rows.length === 0 && <EmptyState>Игнорируемых периодов нет</EmptyState>}

      {rows.map((row, index) => (
        <div className="hist-item" key={`${row.a}-${row.b}-${index}`}>
          <div>
            <div>
              {row.a} — {row.b}
            </div>
            {row.comment && <div className="d">{row.comment}</div>}
          </div>

          {canManage && (
            <button
              type="button"
              className="win-close"
              onClick={() => setRows(current => current.filter((_, i) => i !== index))}
              disabled={acting}
              title="Убрать"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <>
          <form className="login-form" onSubmit={handleAdd}>
            <label>
              Начало
              <input
                id="gap-from"
                type="datetime-local"
                value={form.a}
                onChange={event => setForm(current => ({ ...current, a: event.target.value }))}
                disabled={acting}
                required
              />
            </label>

            <label>
              Конец
              <input
                id="gap-to"
                type="datetime-local"
                value={form.b}
                onChange={event => setForm(current => ({ ...current, b: event.target.value }))}
                disabled={acting}
                required
              />
            </label>

            <label>
              Что с данными
              <input
                id="gap-comment"
                value={form.comment}
                onChange={event => setForm(current => ({ ...current, comment: event.target.value }))}
                disabled={acting}
              />
            </label>

            {formError && <div className="login-error">{formError}</div>}

            <Button type="submit" disabled={acting || Boolean(formError)}>
              Добавить период
            </Button>
          </form>

          <div className="login-form">
            <label>
              Причина изменения
              <input
                id="gaps-reason"
                value={reason}
                onChange={event => setReason(event.target.value)}
                disabled={acting}
              />
            </label>

            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={acting || !changed || !reason.trim()}
            >
              {acting ? 'Применяется…' : `Сохранить как версию ${status.gaps.version + 1}`}
            </Button>

            {changed && !acting && (
              <Button type="button" onClick={() => setRows(status.gaps.rows)}>
                Отменить правки
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

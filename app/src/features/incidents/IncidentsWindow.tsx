import { FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useObjects } from '../objects/hooks/useObjects';
import { useConfirmIncident } from './hooks/useConfirmIncident';
import { useIncidents } from './hooks/useIncidents';
import { incidentTypeLabels } from './incidentLabels';

export default function IncidentsWindow() {
  const { objects } = useObjects();
  const { incidents, loading, error, objectId, setObjectId, reload } = useIncidents();
  const { confirmIncident, confirming, error: confirmError } = useConfirmIncident();
  const canConfirm = usePermission('incidents', 'update');

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!confirmingId) {
      return;
    }

    const confirmed = await confirmIncident(confirmingId, { outcome: outcome || null });
    if (confirmed) {
      setConfirmingId(null);
      setOutcome('');
      reload();
    }
  }

  return (
    <div className="pd-body">
      <div className="win-toolbar">
        <select
          value={objectId ?? ''}
          onChange={event => setObjectId(event.target.value ? Number(event.target.value) : undefined)}
        >
          <option value="">Все объекты</option>
          {objects.map(object => (
            <option key={object.id} value={object.id}>
              {object.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && incidents.length === 0 && <EmptyState>Происшествий пока нет</EmptyState>}

      {incidents.map(incident => (
        <div key={incident.id}>
          <div className="hist-item">
            <div>
              <div>
                {incidentTypeLabels[incident.type]} · {objectName(incident.objectId)}
              </div>
              <div className="d">
                {new Date(incident.startedAt).toLocaleString('ru-RU')}
                {incident.outcome ? ` · ${incident.outcome}` : ''}
              </div>
            </div>

            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone={incident.confirmedAt ? 'low' : 'high'}>
                {incident.confirmedAt ? 'подтверждено' : 'не подтверждено'}
              </Badge>

              {canConfirm && !incident.confirmedAt && (
                <button
                  className="chip-filter"
                  onClick={() => {
                    setConfirmingId(incident.id);
                    setOutcome('');
                  }}
                >
                  Подтвердить
                </button>
              )}
            </span>
          </div>

          {confirmingId === incident.id && (
            <form className="login-form" onSubmit={handleConfirm}>
              <label>
                Итог
                <input value={outcome} onChange={event => setOutcome(event.target.value)} disabled={confirming} />
              </label>

              {confirmError && <div className="login-error">{confirmError}</div>}

              <div className="pd-actions">
                <Button type="button" onClick={() => setConfirmingId(null)} disabled={confirming}>
                  Отмена
                </Button>

                <Button type="submit" variant="primary" disabled={confirming}>
                  {confirming ? 'Сохранение…' : 'Подтвердить'}
                </Button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { modelControlRepository } from '../../entities/modelControl/modelControlRepository';
import { ModelBuild, ModelStatus } from '../../entities/modelControl/types';
import { FORECAST_TYPES, PredictionType } from '../../entities/prediction/types';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { predictionTypeLabels } from '../predictions/predictionLabels';
import { ModelCommandSender } from './hooks/useModelStatus';

interface Props {
  status: ModelStatus;
  send: ModelCommandSender;
  acting: boolean;
}

function buildLabel(build: ModelBuild): string {
  return `v${build.number}${build.name ? ` · ${build.name}` : ''}`;
}

// Ротация версий (§9.4): у типа может быть несколько собранных версий, какая считает — выбирает админ.
// «Основная» — модель главной выгрузки.
export default function ModelVersionsTab({ status, send, acting }: Props) {
  const canManage = usePermission('model_settings', 'manage');
  const [choice, setChoice] = useState<Partial<Record<PredictionType, string>>>({});
  const [reason, setReason] = useState('');

  function chosen(type: PredictionType): string {
    return choice[type] ?? String(status.types[type]?.current ?? '');
  }

  async function handleSwitch(type: PredictionType) {
    const value = chosen(type);
    const versionId = value ? Number(value) : null;

    const sent = await send(
      () => modelControlRepository.switchVersion(type, versionId, reason.trim()),
      next => (next.types[type]?.current ?? null) === versionId
    );

    if (sent) {
      setChoice(current => ({ ...current, [type]: undefined }));
      setReason('');
    }
  }

  return (
    <div>
      {status.retrain.needed && (
        <div className="status-note">
          Нужно переобучение{status.retrain.reason ? `: ${status.retrain.reason}` : ''}.
          {status.retrain.enabled
            ? ' Запуск — командой модели.'
            : ' В этом контуре переобучение выключено: новые версии собираются вне стенда и появляются в списке ниже.'}
        </div>
      )}

      {canManage && (
        <form className="login-form" onSubmit={event => event.preventDefault()}>
          <label>
            Причина переключения
            <input
              id="model-version-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              disabled={acting}
            />
          </label>
        </form>
      )}

      {FORECAST_TYPES.map(type => {
        const entry = status.types[type];
        if (!entry) {
          return null;
        }

        const current = entry.available.find(build => build.number === entry.current);
        const changed = chosen(type) !== String(entry.current ?? '');

        return (
          <div className="hist-item" key={type}>
            <div>
              <div>{predictionTypeLabels[type]}</div>
              <div className="d">
                считает {current ? buildLabel(current) : entry.current !== null ? `v${entry.current}` : 'основная'}
                {current?.about ? ` · ${current.about}` : ''}
              </div>
            </div>

            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {entry.available.length === 0 && <Badge tone="low">одна версия</Badge>}

              {canManage && entry.available.length > 0 && (
                <>
                  <select
                    id={`model-version-${type}`}
                    value={chosen(type)}
                    onChange={event => setChoice(current => ({ ...current, [type]: event.target.value }))}
                    disabled={acting}
                  >
                    <option value="">основная</option>
                    {entry.available.map(build => (
                      <option key={build.number} value={build.number}>
                        {buildLabel(build)}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleSwitch(type)}
                    disabled={acting || !changed || !reason.trim()}
                    title={reason.trim() ? undefined : 'Укажите причину переключения'}
                  >
                    Переключить
                  </Button>
                </>
              )}
            </span>
          </div>
        );
      })}

      <div className="form-hint">Порог новой версии модель пересчитает по её прогону 2025 года. Запись о переключении — в аудите модели.</div>
    </div>
  );
}

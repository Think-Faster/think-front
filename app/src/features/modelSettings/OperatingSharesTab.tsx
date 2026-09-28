import { FormEvent, useEffect, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { modelControlRepository } from '../../entities/modelControl/modelControlRepository';
import { ModelStatus, OperatingShare, ShareEstimate } from '../../entities/modelControl/types';
import { FORECAST_TYPES, PredictionType } from '../../entities/prediction/types';
import Button from '../../shared/ui/Button';
import { predictionTypeLabels } from '../predictions/predictionLabels';
import { ModelCommandSender } from './hooks/useModelStatus';

interface Props {
  status: ModelStatus;
  send: ModelCommandSender;
  acting: boolean;
}

// Поля формы — строки: доля в процентах часов, rejectK как есть (пусто — правило отклонения выключено).
type Draft = Record<PredictionType, { share: string; rejectK: string }>;

const ESTIMATE_DELAY_MS = 400;

function toPercent(share: number): string {
  return String(Math.round(share * 10000) / 100);
}

function draftOf(status: ModelStatus): Draft {
  return Object.fromEntries(
    FORECAST_TYPES.map(type => {
      const entry = status.settings.types[type];
      return [type, { share: entry ? toPercent(entry.share) : '', rejectK: entry?.rejectK?.toString() ?? '' }];
    })
  ) as Draft;
}

// Рабочая доля (§9.3) — какая доля часов парка поднимет тревогу этого типа: выше доля — больше тревог,
// меньше пропусков. rejectK — насколько отклонения диспетчера поднимают порог объекта (газ, подтопление).
// Границы — из схемы модели (/status settings_bounds), снимок уходит целиком со следующим номером версии.
export default function OperatingSharesTab({ status, send, acting }: Props) {
  const canManage = usePermission('model_settings', 'manage');
  const [draft, setDraft] = useState<Draft>(() => draftOf(status));
  const [reason, setReason] = useState('');
  const [estimates, setEstimates] = useState<Partial<Record<PredictionType, ShareEstimate | string>>>({});
  const [focused, setFocused] = useState<PredictionType | null>(null);

  const settings = status.settings;
  const [rejectMin, rejectMax] = status.bounds.rejectK;

  useEffect(() => {
    setDraft(draftOf(status));
  }, [status]);

  // Проценты → доля; округление убирает хвост плавающей точки (2,6 % → 0.026, а не 0.026000000000000002),
  // иначе модель запишет в аудит изменение, которого не было.
  function share(type: PredictionType): number {
    return Math.round(Number(draft[type].share.replace(',', '.')) * 10000) / 1000000;
  }

  function shareError(type: PredictionType): string {
    const bounds = status.bounds.share[type];
    const value = share(type);
    if (!bounds || !Number.isFinite(value)) {
      return 'не число';
    }
    return value < bounds[0] || value > bounds[1] ? `от ${toPercent(bounds[0])} до ${toPercent(bounds[1])} %` : '';
  }

  function rejectError(type: PredictionType): string {
    const raw = draft[type].rejectK.trim();
    if (!raw) {
      return '';
    }
    const value = Number(raw.replace(',', '.'));
    return Number.isFinite(value) && value >= rejectMin && value <= rejectMax ? '' : `от ${rejectMin} до ${rejectMax}`;
  }

  // Оценка «сколько тревог в сутки» по истории модели — для типа, долю которого сейчас правят.
  const probeType = focused && !shareError(focused) ? focused : null;
  const probeShare = probeType ? share(probeType) : null;

  useEffect(() => {
    if (!probeType || probeShare === null) {
      return undefined;
    }

    const timer = setTimeout(() => {
      modelControlRepository
        .estimate(probeType, probeShare)
        .then(estimate => setEstimates(current => ({ ...current, [probeType]: estimate })))
        .catch(() => setEstimates(current => ({ ...current, [probeType]: 'оценка недоступна' })));
    }, ESTIMATE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [probeType, probeShare]);

  const invalid = FORECAST_TYPES.some(type => shareError(type) || rejectError(type));
  const changed = FORECAST_TYPES.some(type => {
    const entry = settings.types[type];
    const rejectK = draft[type].rejectK.trim();
    return (
      !entry ||
      Math.abs(share(type) - entry.share) > 1e-9 ||
      (rejectK ? Number(rejectK.replace(',', '.')) : null) !== entry.rejectK
    );
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const types = Object.fromEntries(
      FORECAST_TYPES.map(type => {
        const rejectK = draft[type].rejectK.trim();
        const value: OperatingShare = {
          share: share(type),
          rejectK: rejectK ? Number(rejectK.replace(',', '.')) : null,
        };
        return [type, value];
      })
    ) as Record<PredictionType, OperatingShare>;

    const version = settings.version + 1;
    const sent = await send(
      () => modelControlRepository.setOperating(version, reason.trim(), types),
      next => next.settings.version >= version
    );

    if (sent) {
      setReason('');
      setEstimates({});
    }
  }

  function setField(type: PredictionType, field: 'share' | 'rejectK', value: string) {
    setDraft(current => ({ ...current, [type]: { ...current[type], [field]: value } }));
  }

  function estimateText(type: PredictionType): string {
    const estimate = estimates[type];
    if (!estimate) {
      return '';
    }
    if (typeof estimate === 'string') {
      return estimate;
    }
    return `≈ ${estimate.alarmsPerDay.toFixed(1)} тревог в сутки по последним ${Math.round(estimate.windowDays)} суткам`;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-hint">
        Версия {settings.version}
        {settings.changed ? ` · ${new Date(settings.changed).toLocaleString('ru-RU')}` : ''}
        {settings.changedBy ? ` · ${settings.changedBy}` : ''}
        {settings.reason ? ` · ${settings.reason}` : ''}
      </div>

      {FORECAST_TYPES.map(type => {
        const bounds = status.bounds.share[type];

        return (
          <div className="hist-item" key={type}>
            <div>
              <div>{predictionTypeLabels[type]}</div>
              <div className="d">
                {bounds ? `доля ${toPercent(bounds[0])}–${toPercent(bounds[1])} % часов` : ''}
                {shareError(type) ? ` · ${shareError(type)}` : ''}
                {rejectError(type) ? ` · rejectK ${rejectError(type)}` : ''}
              </div>
              {estimateText(type) && <div className="d">{estimateText(type)}</div>}
            </div>

            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id={`share-${type}`}
                type="number"
                step="0.05"
                min={bounds ? toPercent(bounds[0]) : undefined}
                max={bounds ? toPercent(bounds[1]) : undefined}
                value={draft[type].share}
                onChange={event => setField(type, 'share', event.target.value)}
                onFocus={() => setFocused(type)}
                disabled={!canManage || acting}
                title="Доля часов, %"
                style={{ width: 80 }}
              />
              %
              <input
                id={`reject-k-${type}`}
                type="number"
                step="0.05"
                min={rejectMin}
                max={rejectMax}
                value={draft[type].rejectK}
                onChange={event => setField(type, 'rejectK', event.target.value)}
                disabled={!canManage || acting}
                placeholder="выкл."
                title="rejectK: пусто — правило отклонения выключено"
                style={{ width: 70 }}
              />
            </span>
          </div>
        );
      })}

      {canManage && (
        <div className="login-form">
          <label>
            Причина изменения
            <input
              id="operating-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              disabled={acting}
              required
            />
          </label>

          <Button type="submit" variant="primary" disabled={acting || invalid || !changed || !reason.trim()}>
            {acting ? 'Применяется…' : `Сохранить как версию ${settings.version + 1}`}
          </Button>
        </div>
      )}
    </form>
  );
}

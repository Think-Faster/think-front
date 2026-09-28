import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ProgressBar from '../../shared/ui/ProgressBar';
import { openWindowWithObject, useWindowEntityId } from '../../stores/workspace/windowScope';
import { showObjectOnMap } from '../map/mapRequest';
import { useObjects } from '../objects/hooks/useObjects';
import { usePrediction } from './hooks/usePrediction';
import {
  formatProbability,
  POSSIBLE_ACCIDENT_LABEL,
  predictionTypeLabels,
  probabilityTone,
  REJECT_REASON_OTHER,
  rejectReasonOptions,
} from './predictionLabels';

// datetime-local без секунд в местном времени: «сейчас + hours».
function localInputValue(hours: number): string {
  const date = new Date(Date.now() + hours * 3600_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatTs(value: string): string {
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

export default function PredictionDetailWindow() {
  // Первая карточка — прогноз из адреса /predictions/:id, копия — свой.
  const predictionId = useWindowEntityId();
  const navigate = useNavigate();
  const { objects } = useObjects();
  const { prediction, loading, error, decide, takeToTask, deciding, decisionError } = usePrediction(predictionId);
  const canDecide = usePermission('predictions', 'update');
  const canReadTasks = usePermission('tasks', 'read');
  const canMap = usePermission('objects', 'read');
  const canReadings = usePermission('readings', 'read');

  const [rejecting, setRejecting] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');
  const [muting, setMuting] = useState(false);
  const [mutedUntil, setMutedUntil] = useState('');

  if (loading && !prediction) {
    return <EmptyState>Загрузка…</EmptyState>;
  }

  if (error) {
    return <div className="status-note rej">{error}</div>;
  }

  if (!prediction) {
    return <EmptyState>Выберите прогноз в очереди</EmptyState>;
  }

  const object = objects.find(item => item.id === prediction.objectId);
  const tone = probabilityTone(prediction.probability);

  // BFF заводит заявку сам и отдаёт её id; без права читать заявки остаёмся в карточке.
  async function handleTake() {
    const taskId = await takeToTask();
    if (taskId && canReadTasks) {
      navigate(`/tasks/${taskId}`);
    }
  }

  function startMute() {
    setMutedUntil(localInputValue(24));
    setMuting(true);
  }

  // Модель глушит пару объект-тип до until; BFF не примет срок ближе часа.
  async function handleMute(event: FormEvent) {
    event.preventDefault();

    const ok = await decide({ action: 'mute', until: new Date(mutedUntil).toISOString(), comment: comment || null });
    if (ok) {
      setMuting(false);
      setComment('');
    }
  }

  function openLogs() {
    openWindowWithObject('logs', prediction!.objectId);
  }

  async function handleReject(event: FormEvent) {
    event.preventDefault();

    const ok = await decide({ action: 'reject', reasonCode, comment: comment || null });
    if (ok) {
      setRejecting(false);
      setReasonCode('');
      setComment('');
    }
  }

  const canAct = canDecide && (prediction.status === 'new' || prediction.status === 'inReview');
  const canReopen = canDecide && (prediction.status === 'taken' || prediction.status === 'rejected' || prediction.status === 'muted');

  return (
    <div className="pd-body">
      <div className="pd-risk-row">
        <Badge tone={tone}>{predictionTypeLabels[prediction.type]}</Badge>
      </div>

      <p className="pd-title">{prediction.topic}</p>

      <p className="pd-loc">
        {object ? object.name : `Объект #${prediction.objectId}`} ·{' '}
        {new Date(prediction.hourEnd).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
      </p>

      {/* §13.11: объект «слепой» — прогноз опирается на то, что было до потери данных */}
      {object?.status === 'offline' && (
        <div className="status-note rej">
          Объект не видно: показания не приходят, прогноз по данным до потери — {POSSIBLE_ACCIDENT_LABEL}.
        </div>
      )}

      {(canMap || canReadings) && (
        <div className="pd-actions">
          {canMap && <Button onClick={() => showObjectOnMap(prediction.objectId)}>Карта объекта</Button>}
          {canReadings && <Button onClick={openLogs}>Логи объекта</Button>}
        </div>
      )}

      <div className="pd-prob">
        <span className="num">{formatProbability(prediction.probability)}</span>
        <span className="unit">вероятность</span>
      </div>

      <ProgressBar percent={Math.round(prediction.probability * 100)} />

      <div className="pd-horizon">
        Горизонт прогноза: <b>{prediction.horizonHours} ч</b>
      </div>

      {prediction.description && (
        <>
          <p className="pd-section-title">Описание</p>
          <p>{prediction.description}</p>
        </>
      )}

      {prediction.factors.length > 0 && (
        <>
          <p className="pd-section-title">Факторы</p>

          <ul className="why-list">
            {prediction.factors.map(factor => (
              <li key={factor.feature}>
                {factor.feature}: {factor.value}
                {(factor.weight !== 0 || factor.direction) &&
                  ` (${[factor.weight !== 0 ? `вес ${factor.weight}` : '', factor.direction].filter(Boolean).join(', ')})`}
              </li>
            ))}
          </ul>
        </>
      )}

      {prediction.evidence.length > 0 && (
        <>
          <p className="pd-section-title">Показания-свидетели</p>

          <ul className="why-list">
            {prediction.evidence.map(item => (
              <li key={`${item.sensorId}-${item.ts}`}>
                Датчик #{item.sensorId}
                {item.picketId !== null && `, пикет ${item.picketId}`} · {formatTs(item.ts)}
                {item.value !== null && ` · ${item.value}`}
              </li>
            ))}
          </ul>
        </>
      )}

      {prediction.recommendation && (
        <div className="rec-box">
          <div className="lbl">Рекомендация</div>
          <div className="txt" style={{ whiteSpace: 'pre-line' }}>{prediction.recommendation}</div>
        </div>
      )}

      {decisionError && <div className="login-error">{decisionError}</div>}

      {canAct && !rejecting && !muting && (
        <div className="pd-actions">
          <Button disabled={deciding} onClick={() => setRejecting(true)}>
            Отклонить
          </Button>

          <Button disabled={deciding} onClick={startMute}>
            Заглушить
          </Button>

          <Button variant="primary" disabled={deciding} onClick={handleTake}>
            Взять в работу
          </Button>
        </div>
      )}

      {rejecting && (
        <form className="login-form" onSubmit={handleReject}>
          <label>
            Причина
            <select
              value={reasonCode}
              onChange={event => setReasonCode(event.target.value)}
              disabled={deciding}
              required
            >
              <option value="">— выбрать —</option>
              {rejectReasonOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Комментарий
            <input
              value={comment}
              onChange={event => setComment(event.target.value)}
              disabled={deciding}
              required={reasonCode === REJECT_REASON_OTHER}
            />
          </label>

          <div className="pd-actions">
            <Button type="button" onClick={() => setRejecting(false)} disabled={deciding}>
              Отмена
            </Button>

            <Button type="submit" variant="primary" disabled={deciding}>
              {deciding ? 'Сохранение…' : 'Подтвердить отказ'}
            </Button>
          </div>
        </form>
      )}

      {muting && (
        <form className="login-form" onSubmit={handleMute}>
          <label>
            Не показывать тревоги этого типа по объекту до
            <input
              type="datetime-local"
              value={mutedUntil}
              min={localInputValue(1)}
              onChange={event => setMutedUntil(event.target.value)}
              disabled={deciding}
              required
            />
          </label>

          <label>
            Комментарий
            <input value={comment} onChange={event => setComment(event.target.value)} disabled={deciding} />
          </label>

          <div className="pd-actions">
            <Button type="button" onClick={() => setMuting(false)} disabled={deciding}>
              Отмена
            </Button>

            <Button type="submit" variant="primary" disabled={deciding || !mutedUntil}>
              {deciding ? 'Сохранение…' : 'Заглушить'}
            </Button>
          </div>
        </form>
      )}

      {prediction.status === 'taken' && <div className="status-note ok">Взято в работу</div>}

      {prediction.status === 'rejected' && <div className="status-note rej">Отклонён</div>}

      {prediction.status === 'muted' && (
        <div className="status-note rej">
          Заглушен
          {prediction.mutedReason && prediction.mutedReason !== 'decision' ? ` · ${prediction.mutedReason}` : ''}
        </div>
      )}

      {prediction.status === 'closed' && <div className="status-note ok">Закрыт</div>}

      {canReopen && (
        <div className="pd-actions">
          <Button disabled={deciding} onClick={() => decide({ action: 'reopen' })}>
            Вернуть на рассмотрение
          </Button>
        </div>
      )}
    </div>
  );
}

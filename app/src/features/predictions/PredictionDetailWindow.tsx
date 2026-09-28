import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ProgressBar from '../../shared/ui/ProgressBar';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { showObjectOnMap } from '../map/mapRequest';
import { useObjects } from '../objects/hooks/useObjects';
import { usePrediction } from './hooks/usePrediction';
import {
  formatProbability,
  predictionTypeLabels,
  probabilityTone,
  REJECT_REASON_OTHER,
  rejectReasonOptions,
} from './predictionLabels';

export default function PredictionDetailWindow() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { objects } = useObjects();
  const { prediction, loading, error, decide, takeToTask, deciding, decisionError } = usePrediction(params.id);
  const canDecide = usePermission('predictions', 'update');
  const canCreateTask = usePermission('tasks', 'create');
  const canMap = usePermission('objects', 'read');
  const canReadings = usePermission('readings', 'read');
  const setSelectedId = useSelectionStore(state => state.setObjectId);

  const [rejecting, setRejecting] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

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

  async function handleTake() {
    const taskId = await takeToTask();
    if (taskId) {
      navigate(`/tasks/${taskId}`);
    }
  }

  function openLogs() {
    setSelectedId(prediction!.objectId);
    openWindow('logs');
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
                {factor.feature}: {factor.value} (вес {factor.weight}, {factor.direction})
              </li>
            ))}
          </ul>
        </>
      )}

      {prediction.recommendation && (
        <div className="rec-box">
          <div className="lbl">Рекомендация</div>
          <div className="txt">{prediction.recommendation}</div>
        </div>
      )}

      {decisionError && <div className="login-error">{decisionError}</div>}

      {canAct && !rejecting && (
        <div className="pd-actions">
          <Button disabled={deciding} onClick={() => setRejecting(true)}>
            Отклонить
          </Button>

          <Button disabled={deciding} onClick={() => decide({ action: 'mute' })}>
            Заглушить
          </Button>

          <Button
            variant="primary"
            disabled={deciding}
            onClick={canCreateTask ? handleTake : () => decide({ action: 'take' })}
          >
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

      {prediction.status === 'taken' && <div className="status-note ok">Взято в работу</div>}

      {prediction.status === 'rejected' && <div className="status-note rej">Отклонён</div>}

      {prediction.status === 'muted' && (
        <div className="status-note rej">
          Заглушен{prediction.mutedReason ? ` · ${prediction.mutedReason}` : ''}
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

import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ProgressBar from '../../shared/ui/ProgressBar';
import { useObjects } from '../objects/hooks/useObjects';
import { usePrediction } from './hooks/usePrediction';
import { formatProbability, predictionTypeLabels, probabilityTone } from './predictionLabels';

export default function PredictionDetailWindow() {
  const params = useParams<{ id: string }>();
  const { objects } = useObjects();
  const { prediction, loading, error, decide, deciding, decisionError } = usePrediction(params.id);
  const canDecide = usePermission('predictions', 'update');

  const [rejecting, setRejecting] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  if (loading) {
    return null;
  }

  if (error) {
    return <div className="status-note rej">{error}</div>;
  }

  if (!prediction) {
    return <EmptyState>Выберите прогноз в очереди</EmptyState>;
  }

  const object = objects.find(item => item.id === prediction.objectId);
  const tone = probabilityTone(prediction.probability);

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

      <p className="pd-loc">{object ? object.name : `Объект #${prediction.objectId}`}</p>

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

          <Button variant="primary" disabled={deciding} onClick={() => decide({ action: 'take' })}>
            Взять в работу
          </Button>
        </div>
      )}

      {rejecting && (
        <form className="login-form" onSubmit={handleReject}>
          <label>
            Код причины
            <input
              value={reasonCode}
              onChange={event => setReasonCode(event.target.value)}
              disabled={deciding}
              required
            />
          </label>

          <label>
            Комментарий
            <input value={comment} onChange={event => setComment(event.target.value)} disabled={deciding} />
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

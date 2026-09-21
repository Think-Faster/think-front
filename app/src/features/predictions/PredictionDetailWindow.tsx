import { Link, useParams } from 'react-router-dom';

import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ProgressBar from '../../shared/ui/ProgressBar';
import { usePrediction } from './hooks/usePrediction';
import { riskLabelLong } from './predictionLabels';

export default function PredictionDetailWindow() {
  const params = useParams<{ id: string }>();
  const selectedId = params.id ?? 'p1';

  const { prediction, loading, accept, reject } = usePrediction(selectedId);

  if (loading) {
    return null;
  }

  if (!prediction) {
    return <EmptyState>Прогноз не найден</EmptyState>;
  }

  return (
    <div className="pd-body">
      <div className="pd-risk-row">
        <Badge tone={prediction.risk}>{riskLabelLong[prediction.risk]}</Badge>
      </div>

      <p className="pd-title">{prediction.title}</p>

      <p className="pd-loc">
        {prediction.object} · {prediction.segment}
      </p>

      <div className="pd-prob">
        <span className="num">{prediction.probability}%</span>
        <span className="unit">вероятность</span>
      </div>

      <ProgressBar percent={prediction.probability} />

      <div className="pd-horizon">
        Горизонт прогноза: <b>{prediction.horizon}</b>
      </div>

      <p className="pd-section-title">Почему</p>

      <ul className="why-list">
        {prediction.why.map(reason => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="rec-box">
        <div className="lbl">Рекомендация</div>
        <div className="txt">{prediction.recommendation}</div>
      </div>

      {/* predictions is a local mock entity, not a registered BFF resource
          (docs/FRONTEND_INTEGRATION.md §4 lists users/groups/permissions
          only) — gating this on can()/usePermission() would hide the
          buttons for every real user once /permissions/me is live. */}
      {prediction.status === 'new' && (
        <div className="pd-actions">
          <Button onClick={() => reject('Ошибка датчика')}>Отклонить</Button>
          <Button variant="primary" onClick={accept}>
            Взять в работу
          </Button>
        </div>
      )}

      {prediction.status === 'work' && (
        <div className="status-note ok">
          Взято в работу · задача передана инженеру
        </div>
      )}

      {prediction.status === 'rejected' && (
        <div className="status-note rej">
          Отклонён · причина: {prediction.rejectReason}
        </div>
      )}

      <Link className="prediction-open-link" to={`/predictions/${prediction.id}`}>
        Открыть прямую ссылку
      </Link>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';

import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import { useObjects } from '../objects/hooks/useObjects';
import { usePredictions } from './hooks/usePredictions';
import PredictionFilters from './PredictionFilters';
import { formatProbability, predictionTypeLabels, predictionStatusLabels, probabilityTone } from './predictionLabels';

export default function PredictionQueueWindow() {
  const location = useLocation();
  const { objects } = useObjects();
  const { predictions, loading, error, status, setStatus, objectId, setObjectId } = usePredictions();

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  return (
    <>
      <PredictionFilters
        status={status}
        onStatusChange={setStatus}
        objectId={objectId}
        onObjectChange={setObjectId}
      />

      <div>
        {loading && <EmptyState>Загрузка…</EmptyState>}
        {error && <div className="status-note rej">{error}</div>}
        {!loading && !error && predictions.length === 0 && <EmptyState>Прогнозов пока нет</EmptyState>}

        {predictions.map(prediction => {
          const active = location.pathname === `/predictions/${prediction.id}`;
          const tone = probabilityTone(prediction.probability);

          return (
            <Link
              key={prediction.id}
              to={`/predictions/${prediction.id}`}
              className={`queue-item risk-${tone} ${active ? 'active' : ''} ${
                prediction.status !== 'new' ? 'resolved' : ''
              }`}
            >
              <div className="queue-top">
                <span className="queue-obj">
                  {objectName(prediction.objectId)} · {predictionTypeLabels[prediction.type]}
                </span>

                <Badge tone={tone}>{formatProbability(prediction.probability)}</Badge>
              </div>

              <div className="queue-desc">{prediction.topic}</div>

              <div className="queue-meta">
                {predictionStatusLabels[prediction.status]} · {prediction.sinceHours} ч
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

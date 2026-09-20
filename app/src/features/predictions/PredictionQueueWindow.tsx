import { Link, useLocation } from 'react-router-dom';

import Badge from '../../shared/ui/Badge';
import { usePredictions } from './hooks/usePredictions';
import PredictionFilters from './PredictionFilters';
import { predictionStatusLabel } from './predictionLabels';

export default function PredictionQueueWindow() {
  const location = useLocation();
  const { predictions, risk, setRisk, status, setStatus } = usePredictions();

  return (
    <>
      <PredictionFilters
        risk={risk}
        onRiskChange={setRisk}
        status={status}
        onStatusChange={setStatus}
      />

      <div>
        {predictions.map(prediction => {
          const active = location.pathname === `/predictions/${prediction.id}`;

          return (
            <Link
              key={prediction.id}
              to={`/predictions/${prediction.id}`}
              className={`queue-item risk-${prediction.risk} ${active ? 'active' : ''} ${
                prediction.status !== 'new' ? 'resolved' : ''
              }`}
            >
              <div className="queue-top">
                <span className="queue-obj">
                  {prediction.object} · {prediction.segment}
                </span>

                <Badge tone={prediction.risk}>
                  {predictionStatusLabel(prediction.status, prediction.probability)}
                </Badge>
              </div>

              <div className="queue-desc">{prediction.title}</div>
              <div className="queue-meta">горизонт {prediction.horizon}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

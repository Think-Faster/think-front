import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import {
  predictions,
  Risk,
  PredictionStatus,
} from '../../data/mockData';

const riskLabel: Record<Risk, string> = {
  high: 'Высокий',
  med: 'Средний',
  low: 'Наблюдение',
};

export default function PredictionQueue() {
  const location = useLocation();

  const [risk, setRisk] =
    useState<Risk | 'all'>('all');

  const [status, setStatus] =
    useState<
      PredictionStatus | 'all'
    >('all');

  const list = useMemo(
    () =>
      predictions.filter(
        prediction =>
          (risk === 'all' ||
            prediction.risk === risk) &&
          (status === 'all' ||
            prediction.status === status)
      ),
    [risk, status]
  );

  return (
    <>

      <div className="win-toolbar">

        <div className="filter-group">

          <Filter
            active={risk === 'all'}
            onClick={() =>
              setRisk('all')
            }
          >
            Все риски
          </Filter>

          <Filter
            active={risk === 'high'}
            onClick={() =>
              setRisk('high')
            }
          >
            Высокий
          </Filter>

          <Filter
            active={risk === 'med'}
            onClick={() =>
              setRisk('med')
            }
          >
            Средний
          </Filter>

          <Filter
            active={risk === 'low'}
            onClick={() =>
              setRisk('low')
            }
          >
            Наблюдение
          </Filter>

        </div>

        <div className="filter-sep" />

        <div className="filter-group">

          <Filter
            active={status === 'all'}
            onClick={() =>
              setStatus('all')
            }
          >
            Все статусы
          </Filter>

          <Filter
            active={status === 'new'}
            onClick={() =>
              setStatus('new')
            }
          >
            Новые
          </Filter>

          <Filter
            active={status === 'work'}
            onClick={() =>
              setStatus('work')
            }
          >
            В работе
          </Filter>

          <Filter
            active={status === 'rejected'}
            onClick={() =>
              setStatus('rejected')
            }
          >
            Отклонённые
          </Filter>

        </div>

      </div>

      <div>
        {list.map(prediction => {

          const active =
            location.pathname ===
            `/predictions/${prediction.id}`;

          return (
            <Link
              key={prediction.id}
              to={`/predictions/${prediction.id}`}
              className={
                `queue-item risk-${prediction.risk} ${
                  active ? 'active' : ''
                } ${
                  prediction.status !== 'new'
                    ? 'resolved'
                    : ''
                }`
              }
            >

              <div className="queue-top">

                <span className="queue-obj">
                  {prediction.object}
                  {' · '}
                  {prediction.segment}
                </span>

                <span
                  className={`badge ${prediction.risk}`}
                >
                  {prediction.status === 'new'
                    ? `${prediction.probability}%`
                    : prediction.status === 'work'
                    ? 'в работе'
                    : 'отклонён'}
                </span>

              </div>

              <div className="queue-desc">
                {prediction.title}
              </div>

              <div className="queue-meta">
                горизонт {prediction.horizon}
              </div>

            </Link>
          );
        })}
      </div>

    </>
  );
}

function Filter({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`chip-filter ${
        active ? 'active' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
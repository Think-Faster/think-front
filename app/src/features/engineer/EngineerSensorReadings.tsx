import { Link, useParams } from 'react-router-dom';

import EmptyState from '../../shared/ui/EmptyState';
import { ReloadIcon } from '../../shared/ui/icons';
import { useTask } from '../tasks/hooks/useTask';
import { useCollectorModel } from './hooks/useCollectorModel';
import { useSensorReadings } from './hooks/useSensorReadings';
import { useTaskPlaces } from './hooks/useTaskPlaces';

// «Показания» датчика заявки за сутки, новые сверху. Воронка отдаёт их по
// объекту заявки — инженеру он доступен, пока работа не сдана.
export default function EngineerSensorReadings() {
  const { id, sensorId } = useParams();
  const channel = Number(sensorId);
  const { task } = useTask(id);
  const places = useTaskPlaces(task ? [task.objectId] : []);
  const place = task ? places.get(task.objectId) : undefined;
  const { model } = useCollectorModel(place?.collector?.id ?? null);
  const { readings, loading, error, reload } = useSensorReadings(task?.objectId, channel);
  const name = model.sensorById.get(channel)?.name;

  return (
    <div className="eng-page">
      <Link className="eng-back" to={`/engineer/tasks/${id}`}>
        Вернуться к заявке
      </Link>

      <div className="eng-id">
        <span>Канал № {channel}</span>
        <button className="eng-refresh" aria-label="Обновить показания" onClick={reload} disabled={loading}>
          <ReloadIcon />
        </button>
      </div>
      <h1 className="eng-title">{name ?? 'Показания'}</h1>

      {error && <div className="login-error">{error}</div>}
      {loading && readings.length === 0 && !error && <div className="eng-note">Загрузка…</div>}
      {!loading && !error && readings.length === 0 && <EmptyState>За сутки показаний нет.</EmptyState>}

      {readings.length > 0 && (
        <ul className="eng-readings">
          {readings.map(reading => (
            <li key={reading.eventId} className={reading.alarm ? 'alarm' : ''}>
              <span className="eng-reading-time">
                {reading.date} {reading.time}
              </span>
              <span className="eng-reading-value">{reading.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { Link, useNavigate, useParams } from 'react-router-dom';

import { WorkTask } from '../../entities/task/types';
import { ReloadIcon } from '../../shared/ui/icons';
import { taskResultLabel } from '../tasks/taskLabels';
import { useTask } from '../tasks/hooks/useTask';
import { CollectorModel } from '../map/collector';
import { canStartWork, engineerStatusLabel, isWorkOpen } from './engineerLabels';
import { useCollectorModel } from './hooks/useCollectorModel';
import { fullName, useDispatcher } from './hooks/useDispatcher';
import { useTaskPlaces } from './hooks/useTaskPlaces';
import TaskMap from './TaskMap';

interface SensorGroup {
  title: string;
  sensors: { id: number; name: string; kind: string }[];
}

// Датчики заявки по пикетам — в порядке, в каком их указал диспетчер.
// Названия и пикеты — из слоя датчиков коллектора, нет слоя — из справочника
// в заявке (sensors), нет и там — номер канала.
function groupSensors(task: WorkTask, model: CollectorModel): SensorGroup[] {
  const groups = new Map<string, SensorGroup>();
  for (const id of task.sensorIds) {
    const sensor = model.sensorById.get(id);
    const known = task.sensors.find(item => item.sensorId === id);
    const picket = sensor?.picketId != null ? model.picketById.get(sensor.picketId) : undefined;
    const picketCode = picket?.code ?? known?.picketCode;
    const title = picketCode ? `Пикет ${picketCode}` : 'Без пикета';
    const group = groups.get(title) ?? { title, sensors: [] };
    group.sensors.push({ id, name: sensor?.name || known?.name || `Канал ${id}`, kind: sensor?.stype ?? known?.sType ?? '' });
    groups.set(title, group);
  }
  return Array.from(groups.values());
}

// Карточка заявки инженера (макет «Инженер / Заявка»).
export default function EngineerTaskCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { task, loading, error, acting, actionError, reload, start } = useTask(id);
  const places = useTaskPlaces(task ? [task.objectId] : []);
  const place = task ? places.get(task.objectId) : undefined;
  const { model } = useCollectorModel(place?.collector?.id ?? null);
  const dispatcher = useDispatcher(task?.dispatcherId);

  if (!task) {
    return (
      <div className="eng-page">
        <Link className="eng-back" to="/engineer">
          Вернуться к заявкам
        </Link>
        {error ? <div className="login-error">{error}</div> : loading && <div className="eng-note">Загрузка…</div>}
      </div>
    );
  }

  const assignment = task.assignments.find(item => item.status === 'assigned');
  const report = task.reports[task.reports.length - 1];
  const groups = groupSensors(task, model);
  const open = isWorkOpen(task.status);
  const startFirst = canStartWork(task.status);
  const address = place?.address;

  return (
    <div className="eng-page">
      <Link className="eng-back" to="/engineer">
        Вернуться к заявкам
      </Link>

      <div className="eng-id">
        <span>id: {task.number}</span>
        <button className="eng-refresh" aria-label="Обновить заявку" onClick={reload} disabled={loading}>
          <ReloadIcon />
        </button>
      </div>

      <h1 className="eng-title">{task.topic}</h1>

      <div className="eng-meta">
        {address && <p>Адрес: {address}</p>}
        <p>
          Объект: {place?.object.name || `Объект ${task.objectId}`}
          <span className="eng-status">{engineerStatusLabel(task.status)}</span>
        </p>
      </div>

      {model.bounds && <TaskMap model={model} objectId={task.objectId} sensorIds={task.sensorIds} />}

      {task.description && (
        <section className="eng-block">
          <h2>Что нужно сделать</h2>
          <p className="eng-text">{task.description}</p>
        </section>
      )}

      {task.workType && (
        <section className="eng-block">
          <h2>Тип работы</h2>
          <p className="eng-text">{task.workType}</p>
        </section>
      )}

      {task.faultClassification && (
        <section className="eng-block">
          <h2>Неисправность</h2>
          <p className="eng-text">{task.faultClassification}</p>
        </section>
      )}

      {groups.length > 0 && (
        <section className="eng-block">
          <h2>Датчики</h2>
          {groups.map(group => (
            <div key={group.title} className="eng-sensor-group">
              <h3>{group.title}</h3>
              {group.sensors.map(sensor => (
                <div key={sensor.id} className="eng-sensor">
                  <span className="eng-sensor-code">№ {sensor.id}</span>
                  <span className="eng-sensor-name">{sensor.name}</span>
                  {sensor.kind && <span className="eng-sensor-kind">{sensor.kind}</span>}
                  <Link to={`/engineer/tasks/${task.id}/sensors/${sensor.id}`}>Показания</Link>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="eng-block">
        <h2>Диспетчер</h2>
        <p className="eng-text">{dispatcher ? fullName(dispatcher) : task.dispatcherId ? '—' : 'Не назначен'}</p>
        {assignment?.comment && (
          <div className="eng-note-card">
            <strong>Комментарий диспетчера:</strong>
            <p>{assignment.comment}</p>
          </div>
        )}
      </section>

      {report && (
        <section className="eng-block">
          <h2>Отчёт</h2>
          <p className="eng-text">{taskResultLabel(report.resultCode)}</p>
          {report.worksDone && <p className="eng-text">{report.worksDone}</p>}
        </section>
      )}

      {actionError && <div className="login-error">{actionError}</div>}

      {open && (
        <div className="eng-actions">
          {startFirst && (
            <button className="eng-btn primary" onClick={() => start()} disabled={acting}>
              Приступить
            </button>
          )}
          <button
            className={`eng-btn ${startFirst ? 'outline' : 'primary'}`}
            onClick={() => navigate(`/engineer/tasks/${task.id}/report`)}
          >
            Отчет
          </button>
          <button className="eng-btn outline" onClick={() => navigate(`/engineer/tasks/${task.id}/request`)}>
            Запрос к диспетчеру
          </button>
        </div>
      )}
    </div>
  );
}

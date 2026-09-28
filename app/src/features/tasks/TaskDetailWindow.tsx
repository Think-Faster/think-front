import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { usePermission } from '../../core/permissions/permissionService';
import { taskRepository } from '../../entities/task/taskRepository';
import { ReturnTargetType, TaskAssignee, WorkTaskStatus } from '../../entities/task/types';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { showObjectOnMap } from '../map/mapRequest';
import { useObjects } from '../objects/hooks/useObjects';
import { usePredictions } from '../predictions/hooks/usePredictions';
import { useUsers } from '../users/hooks/useUsers';
import { useTask } from './hooks/useTask';
import {
  assignmentStatusLabel,
  isTaskActive,
  returnTargetTypeLabels,
  returnTargetTypeOptions,
  taskResultLabel,
  taskResultOptions,
  taskSourceTypeLabels,
  taskStatusLabels,
  taskStatusTone,
} from './taskLabels';

const engineerOnSite: WorkTaskStatus[] = ['assigned', 'engineerWorking', 'returnedToWork'];

export default function TaskDetailWindow() {
  const params = useParams<{ id: string }>();
  const { objects } = useObjects();
  const { users } = useUsers();

  const {
    task,
    loading,
    error,
    acting,
    actionError,
    take,
    addPrediction,
    removePrediction,
    addAssignment,
    addReport,
    addReturn,
    start,
    close,
    cancel,
  } = useTask(params.id);

  // Основанием заявки может быть только прогноз по её объекту.
  const { predictions } = usePredictions(task?.objectId);
  // Кого назначить и кому вернуть — участники групп engineers/dispatchers (BFF /tasks/assignees).
  const [engineers, setEngineers] = useState<TaskAssignee[]>([]);
  const [dispatchers, setDispatchers] = useState<TaskAssignee[]>([]);

  useEffect(() => {
    taskRepository.getAssignees('engineers').then(setEngineers).catch(() => setEngineers([]));
    taskRepository.getAssignees('dispatchers').then(setDispatchers).catch(() => setDispatchers([]));
  }, []);

  const canAct = usePermission('tasks', 'update');
  const canReadings = usePermission('readings', 'read');
  // Карта — окно «Карта» (objects:read): техник видит объект заявки, его входы и схему.
  const canMap = usePermission('objects', 'read');
  const setSelectedId = useSelectionStore(state => state.setObjectId);

  const [predictionId, setPredictionId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const [engineerId, setEngineerId] = useState('');
  const [assignComment, setAssignComment] = useState('');

  const [resultCode, setResultCode] = useState('');
  const [actualState, setActualState] = useState('');
  const [worksDone, setWorksDone] = useState('');
  const [reportComment, setReportComment] = useState('');

  const [returnTarget, setReturnTarget] = useState<ReturnTargetType>('dispatcher');
  const [returnUserId, setReturnUserId] = useState('');
  const [returnComment, setReturnComment] = useState('');

  if (loading && !task) {
    return <EmptyState>Загрузка…</EmptyState>;
  }

  if (error) {
    return <div className="status-note rej">{error}</div>;
  }

  if (!task) {
    return <EmptyState>Выберите заявку в очереди</EmptyState>;
  }

  const object = objects.find(item => item.id === task.objectId);
  const active = isTaskActive(task.status);
  const canEdit = canAct && active;
  // Инженеру показания объекта открыты, пока он на заявке (BFF /readings/scope).
  const canLogs = canReadings || engineerOnSite.includes(task.status);
  // Переходы, которые BFF примет из текущего статуса (иначе 409 invalid_status).
  const hasEngineer = task.assignments.some(item => item.status === 'assigned');
  const canStart = canAct && (task.status === 'assigned' || task.status === 'returnedToWork') && hasEngineer;
  const canReport = canAct && engineerOnSite.includes(task.status) && hasEngineer;
  const canClose = canAct && task.status === 'completed';
  const canCancel = canAct && (task.status === 'new' || active);
  const canReturn = canAct && (active || task.status === 'completed');
  const attachedIds = task.predictions.filter(item => !item.detachedAt).map(item => item.predictionId);
  const attachable = predictions.filter(prediction => !attachedIds.includes(prediction.id));

  function openLogs() {
    setSelectedId(task!.objectId);
    openWindow('logs');
  }

  function userName(userId: string): string {
    const user = users.find(item => item.id === userId)
      ?? engineers.find(item => item.id === userId)
      ?? dispatchers.find(item => item.id === userId);
    return user ? `${user.lastName} ${user.firstName}` : userId;
  }

  function predictionTopic(predictionId: string): string {
    const prediction = predictions.find(item => item.id === predictionId);
    return prediction ? prediction.topic : predictionId;
  }

  async function handleAttachPrediction(event: FormEvent) {
    event.preventDefault();
    if (!predictionId) {
      return;
    }

    if (await addPrediction({ predictionId, isPrimary })) {
      setPredictionId('');
      setIsPrimary(false);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!engineerId) {
      return;
    }

    if (await addAssignment({ engineerId, comment: assignComment || null })) {
      setEngineerId('');
      setAssignComment('');
    }
  }

  async function handleReport(event: FormEvent) {
    event.preventDefault();
    if (!resultCode) {
      return;
    }

    const ok = await addReport({
      resultCode,
      actualState: actualState || null,
      worksDone: worksDone || null,
      comment: reportComment || null,
    });

    if (ok) {
      setResultCode('');
      setActualState('');
      setWorksDone('');
      setReportComment('');
    }
  }

  function handleCancel() {
    if (window.confirm(`Отменить заявку №${task!.number}? Взятые по ней прогнозы закроются.`)) {
      cancel();
    }
  }

  async function handleReturn(event: FormEvent) {
    event.preventDefault();
    if (returnTarget === 'dispatcher' && !returnUserId) {
      return;
    }

    const ok = await addReturn({
      targetType: returnTarget,
      targetUserId: returnTarget === 'dispatcher' ? returnUserId || null : null,
      comment: returnComment || null,
    });

    if (ok) {
      setReturnUserId('');
      setReturnComment('');
    }
  }

  return (
    <div className="pd-body">
      <div className="pd-risk-row">
        <Badge tone={taskStatusTone(task.status)}>{taskStatusLabels[task.status]}</Badge>
      </div>

      <p className="pd-title">
        №{task.number} · {task.topic}
      </p>

      <p className="pd-loc">
        {object ? object.name : `Объект #${task.objectId}`} · {taskSourceTypeLabels[task.sourceType]}
      </p>

      {(canLogs || canMap) && (
        <div className="pd-actions">
          {canMap && <Button onClick={() => showObjectOnMap(task.objectId)}>Карта объекта</Button>}
          {canLogs && <Button onClick={openLogs}>Логи объекта</Button>}
        </div>
      )}

      {task.description && <p>{task.description}</p>}

      <div className="pd-horizon">
        Приоритет: <b>{task.priority}</b>
      </div>

      {actionError && <div className="login-error">{actionError}</div>}

      {(canCancel || canStart || canClose || (task.status === 'new' && canAct)) && (
        <div className="pd-actions">
          {canCancel && (
            <Button disabled={acting} onClick={handleCancel}>
              Отменить заявку
            </Button>
          )}

          {task.status === 'new' && canAct && (
            <Button variant="primary" disabled={acting} onClick={() => take()}>
              Взять в работу
            </Button>
          )}

          {canStart && (
            <Button variant="primary" disabled={acting} onClick={() => start()}>
              Начать работу
            </Button>
          )}

          {canClose && (
            <Button variant="primary" disabled={acting} onClick={() => close()}>
              Принять отчёт и закрыть
            </Button>
          )}
        </div>
      )}

      <p className="pd-section-title">Прогнозы-основания</p>

      {task.predictions.filter(item => !item.detachedAt).length === 0 && (
        <EmptyState>Не прикреплены</EmptyState>
      )}

      {task.predictions
        .filter(item => !item.detachedAt)
        .map(item => (
          <div className="hist-item" key={item.predictionId}>
            <span>
              {predictionTopic(item.predictionId)}
              {item.isPrimary ? ' · основной' : ''}
            </span>

            {canEdit && (
              <button
                className="win-close"
                onClick={() => removePrediction(item.predictionId)}
                title="Открепить"
              >
                ×
              </button>
            )}
          </div>
        ))}

      {canEdit && (
        <form className="login-form" onSubmit={handleAttachPrediction}>
          <label>
            Прогноз
            <select value={predictionId} onChange={event => setPredictionId(event.target.value)}>
              <option value="">— выбрать —</option>
              {attachable.map(prediction => (
                <option key={prediction.id} value={prediction.id}>
                  {prediction.topic}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={event => setIsPrimary(event.target.checked)}
            />
            Основной
          </label>

          <Button type="submit" disabled={acting || !predictionId}>
            Прикрепить прогноз
          </Button>
        </form>
      )}

      <p className="pd-section-title">Назначения</p>

      {task.assignments.length === 0 && <EmptyState>Никто не назначен</EmptyState>}

      {task.assignments.map(assignment => (
        <div className="hist-item" key={assignment.id}>
          <span>
            {userName(assignment.engineerId)}
            {assignment.comment ? ` · ${assignment.comment}` : ''}
          </span>

          <span className="d">{assignmentStatusLabel(assignment.status)}</span>
        </div>
      ))}

      {canEdit && (
        <form className="login-form" onSubmit={handleAssign}>
          <label>
            Инженер
            <select value={engineerId} onChange={event => setEngineerId(event.target.value)}>
              <option value="">— выбрать —</option>
              {engineers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.lastName} {user.firstName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Комментарий
            <input value={assignComment} onChange={event => setAssignComment(event.target.value)} />
          </label>

          <Button type="submit" disabled={acting || !engineerId}>
            Назначить
          </Button>
        </form>
      )}

      <p className="pd-section-title">Отчёты</p>

      {task.reports.length === 0 && <EmptyState>Отчётов нет</EmptyState>}

      {task.reports.map(report => (
        <div className="hist-item" key={report.id}>
          <span>
            {taskResultLabel(report.resultCode)}
            {report.worksDone ? ` · ${report.worksDone}` : ''}
          </span>

          <span className="d">{userName(report.engineerId)}</span>
        </div>
      ))}

      {canReport && (
        <form className="login-form" onSubmit={handleReport}>
          <label>
            Результат
            <select value={resultCode} onChange={event => setResultCode(event.target.value)} required>
              <option value="">— выбрать —</option>
              {taskResultOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Фактическое состояние
            <input value={actualState} onChange={event => setActualState(event.target.value)} />
          </label>

          <label>
            Выполненные работы
            <input value={worksDone} onChange={event => setWorksDone(event.target.value)} />
          </label>

          <label>
            Комментарий
            <input value={reportComment} onChange={event => setReportComment(event.target.value)} />
          </label>

          <Button type="submit" variant="primary" disabled={acting || !resultCode}>
            Отправить отчёт
          </Button>
        </form>
      )}

      <p className="pd-section-title">Возвраты</p>

      {task.returns.length === 0 && <EmptyState>Возвратов нет</EmptyState>}

      {task.returns.map(item => (
        <div className="hist-item" key={item.id}>
          <span>
            {returnTargetTypeLabels[item.targetType]}
            {item.comment ? ` · ${item.comment}` : ''}
          </span>

          <span className="d">{userName(item.returnedBy)}</span>
        </div>
      ))}

      {canReturn && (
        <form className="login-form" onSubmit={handleReturn}>
          <label>
            Куда вернуть
            <ChipFilterGroup options={returnTargetTypeOptions} value={returnTarget} onChange={setReturnTarget} />
          </label>

          {returnTarget === 'dispatcher' && (
            <label>
              Диспетчер
              <select value={returnUserId} onChange={event => setReturnUserId(event.target.value)} required>
                <option value="">— выбрать —</option>
                {dispatchers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.lastName} {user.firstName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Комментарий
            <input value={returnComment} onChange={event => setReturnComment(event.target.value)} />
          </label>

          <Button type="submit" disabled={acting || (returnTarget === 'dispatcher' && !returnUserId)}>
            Вернуть заявку
          </Button>
        </form>
      )}
    </div>
  );
}

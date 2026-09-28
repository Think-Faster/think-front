import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { WorkTask } from '../../entities/task/types';
import ChoiceField from '../../shared/ui/ChoiceField';
import { taskResultOptions } from '../tasks/taskLabels';
import { useTask } from '../tasks/hooks/useTask';
import { isWorkOpen } from './engineerLabels';

type TaskState = ReturnType<typeof useTask>;

interface FormPageProps {
  title: string;
  children: (task: WorkTask, state: TaskState) => ReactNode;
}

// Общая рамка форм инженера: «Вернуться к заявке», номер, заголовок. Форма
// доступна, пока работа не сдана, — иначе BFF ответит 409.
function FormPage({ title, children }: FormPageProps) {
  const { id } = useParams();
  const state = useTask(id);
  const { task, loading, error } = state;

  return (
    <div className="eng-page">
      <Link className="eng-back" to={`/engineer/tasks/${id}`}>
        Вернуться к заявке
      </Link>
      {task && (
        <div className="eng-id">
          <span>id: {task.number}</span>
        </div>
      )}
      <h1 className="eng-title">{title}</h1>

      {error && <div className="login-error">{error}</div>}
      {!task && loading && <div className="eng-note">Загрузка…</div>}
      {task && !isWorkOpen(task.status) && <div className="eng-note">Работа по заявке уже сдана.</div>}
      {task && isWorkOpen(task.status) && children(task, state)}
    </div>
  );
}

// Отчёт (макет «Инженер / Отчет»): результат из справочника (resultCode в BFF
// обязателен) и что сделано. Отчёт переводит заявку в «выполнена».
export function EngineerReportForm() {
  const navigate = useNavigate();
  const [resultCode, setResultCode] = useState('');
  const [worksDone, setWorksDone] = useState('');

  return (
    <FormPage title="Отчет">
      {(task, { acting, actionError, addReport }) => {
        async function submit(event: FormEvent) {
          event.preventDefault();
          const done = await addReport({ resultCode, worksDone: worksDone.trim() || null });
          if (done) {
            navigate(`/engineer/tasks/${task.id}`);
          }
        }

        return (
          <form className="eng-form" onSubmit={submit}>
            <span className="eng-label">Результат</span>
            <span className="eng-choice">
              <ChoiceField
                value={resultCode}
                onChange={setResultCode}
                options={taskResultOptions}
                placeholder="Выберите результат"
                required
              />
            </span>

            <label className="eng-label" htmlFor="eng-report-done">
              Что сделано
            </label>
            <textarea
              id="eng-report-done"
              className="eng-input"
              rows={4}
              placeholder="Опишите выполненные работы"
              value={worksDone}
              onChange={event => setWorksDone(event.target.value)}
            />

            {actionError && <div className="login-error">{actionError}</div>}

            <button className="eng-btn primary" type="submit" disabled={acting || !resultCode}>
              Отправить
            </button>
          </form>
        );
      }}
    </FormPage>
  );
}

// Запрос к диспетчеру (макет «Инженер / Запрос»): заявка возвращается её
// диспетчеру с описанием проблемы; диспетчера нет — в общую очередь.
export function EngineerRequestForm() {
  const navigate = useNavigate();
  const [comment, setComment] = useState('');

  return (
    <FormPage title="Запрос к диспетчеру">
      {(task, { acting, actionError, addReturn }) => {
        async function submit(event: FormEvent) {
          event.preventDefault();
          const done = await addReturn(
            task.dispatcherId
              ? { targetType: 'dispatcher', targetUserId: task.dispatcherId, comment: comment.trim() }
              : { targetType: 'queue', comment: comment.trim() }
          );
          if (done) {
            navigate(`/engineer/tasks/${task.id}`);
          }
        }

        return (
          <form className="eng-form" onSubmit={submit}>
            <label className="eng-label" htmlFor="eng-request-text">
              Опишите проблему
            </label>
            <textarea
              id="eng-request-text"
              className="eng-input"
              rows={5}
              placeholder="Введите текст"
              value={comment}
              onChange={event => setComment(event.target.value)}
              required
            />

            {actionError && <div className="login-error">{actionError}</div>}

            <button className="eng-btn primary" type="submit" disabled={acting || !comment.trim()}>
              Отправить
            </button>
          </form>
        );
      }}
    </FormPage>
  );
}

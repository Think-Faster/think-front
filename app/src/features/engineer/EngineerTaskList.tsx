import { useNavigate } from 'react-router-dom';

import EmptyState from '../../shared/ui/EmptyState';
import { engineerStatusLabel } from './engineerLabels';
import { useMyTasks } from './hooks/useMyTasks';
import { objectTitle, useTaskPlaces } from './hooks/useTaskPlaces';

// Список заявок инженера (макет «Инженер / Список»): номер, коллектор,
// адрес, что случилось, статус. Строка ведёт в карточку.
export default function EngineerTaskList() {
  const navigate = useNavigate();
  const { items, loading, error, hasMore, loadMore } = useMyTasks();
  const places = useTaskPlaces(items.map(task => task.objectId));

  return (
    <div className="eng-page">
      <h1 className="eng-title">Мои заявки</h1>

      {error && <div className="login-error">{error}</div>}

      {!error && !loading && items.length === 0 && <EmptyState>Назначенных вам заявок нет.</EmptyState>}

      {items.length > 0 && (
        <div className="eng-table-wrap">
          <table className="eng-table">
            <thead>
              <tr>
                <th>ID заявки</th>
                <th>Коллектор</th>
                <th>Адрес</th>
                <th>Что случилось</th>
                <th>Статус заявки</th>
              </tr>
            </thead>
            <tbody>
              {items.map(task => {
                const place = places.get(task.objectId);
                const open = () => navigate(`/engineer/tasks/${task.id}`);
                return (
                  <tr
                    key={task.id}
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        open();
                      }
                    }}
                  >
                    <td className="eng-table-id">{task.number}</td>
                    <td>{place?.collector?.name ?? objectTitle(task.objectId, place)}</td>
                    <td>{place?.address ?? '—'}</td>
                    <td>{task.topic}</td>
                    <td>{engineerStatusLabel(task.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <button className="eng-more" onClick={loadMore} disabled={loading}>
          {loading ? 'Загрузка…' : 'Загрузить ещё…'}
        </button>
      )}

      {loading && items.length === 0 && !error && <div className="eng-note">Загрузка…</div>}
    </div>
  );
}

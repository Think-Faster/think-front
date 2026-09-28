import { taskRepository } from '../../../entities/task/taskRepository';
import { usePagedList } from '../../../shared/hooks/usePagedList';

// Заявки, где пользователь назначен инженером сейчас: BFF отбирает их по
// токену (assignedToMe), свой id фронту знать не нужно.
export function useMyTasks() {
  return usePagedList(
    'mine',
    query => taskRepository.getList({ ...query, assignedToMe: true }),
    'Не удалось загрузить заявки.'
  );
}

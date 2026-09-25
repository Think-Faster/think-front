import { ReturnTargetType, TaskSourceType, WorkTaskStatus } from '../../entities/task/types';

export const taskSourceTypeLabels: Record<TaskSourceType, string> = {
  prediction: 'прогноз',
  fact: 'факт',
  call: 'звонок',
  external: 'внешний источник',
};

export const taskSourceTypeOptions: { value: TaskSourceType; label: string }[] = (
  Object.entries(taskSourceTypeLabels) as [TaskSourceType, string][]
).map(([value, label]) => ({ value, label }));

export const taskStatusLabels: Record<WorkTaskStatus, string> = {
  new: 'новая',
  inWork: 'в работе',
  assigned: 'назначена',
  engineerWorking: 'инженер работает',
  completed: 'выполнена',
  closed: 'закрыта',
  returnedToWork: 'возвращена в работу',
  cancelled: 'отменена',
};

export const taskStatusFilterOptions: { value: WorkTaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'new', label: 'Новые' },
  { value: 'inWork', label: 'В работе' },
  { value: 'assigned', label: 'Назначенные' },
  { value: 'engineerWorking', label: 'У инженера' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'returnedToWork', label: 'Возвращённые' },
  { value: 'closed', label: 'Закрытые' },
  { value: 'cancelled', label: 'Отменённые' },
];

export function taskStatusTone(status: WorkTaskStatus): 'high' | 'med' | 'low' {
  switch (status) {
    case 'new':
      return 'high';
    case 'inWork':
    case 'assigned':
    case 'engineerWorking':
    case 'returnedToWork':
      return 'med';
    default:
      return 'low';
  }
}

// Действия над заявкой имеют смысл, пока она реально "в работе" — не до
// взятия (new) и не после завершения (completed/closed/cancelled).
const activeStatuses: WorkTaskStatus[] = ['inWork', 'assigned', 'engineerWorking', 'returnedToWork'];

export function isTaskActive(status: WorkTaskStatus): boolean {
  return activeStatuses.includes(status);
}

export const returnTargetTypeLabels: Record<ReturnTargetType, string> = {
  dispatcher: 'диспетчеру',
  queue: 'в очередь',
  incident: 'в происшествие',
};

export const returnTargetTypeOptions: { value: ReturnTargetType; label: string }[] = (
  Object.entries(returnTargetTypeLabels) as [ReturnTargetType, string][]
).map(([value, label]) => ({ value, label }));

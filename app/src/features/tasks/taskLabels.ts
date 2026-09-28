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

// Справочник результата отчёта — docs/backend/домены-и-сущности.md (справочники).
export const taskResultOptions: { value: string; label: string }[] = [
  { value: 'confirmed_fixed', label: 'Подтверждено и устранено' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'revisit', label: 'Требуется повторный выезд' },
  { value: 'not_confirmed', label: 'Не подтверждено' },
  { value: 'handed_over', label: 'Передано смежникам' },
];

export function taskResultLabel(code: string): string {
  return taskResultOptions.find(option => option.value === code)?.label ?? code;
}

// BFF пишет статус назначения строкой: действующее — "assigned", после
// переназначения прежнее становится "replaced".
const assignmentStatusLabels: Record<string, string> = {
  assigned: 'назначен',
  replaced: 'заменён',
};

export function assignmentStatusLabel(status: string): string {
  return assignmentStatusLabels[status] ?? status;
}

// Номер новой заявки: BFF требует уникальный (409 duplicate_code), а справочника
// нумерации нет — берём дату и время до секунды и короткий хвост против совпадений.
export function newTaskNumber(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const tail = Math.floor(Math.random() * 36 * 36).toString(36).padStart(2, '0').toUpperCase();

  return `З-${date}-${time}-${tail}`;
}

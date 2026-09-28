import { WorkTaskStatus } from '../../entities/task/types';
import { taskStatusLabels } from '../tasks/taskLabels';

// Статус глазами инженера (макет «Инженер»): назначенная ему — новая,
// вернул диспетчеру — у диспетчера.
const engineerStatusLabels: Partial<Record<WorkTaskStatus, string>> = {
  assigned: 'Новая',
  engineerWorking: 'В работе',
  returnedToWork: 'У диспетчера',
  completed: 'Отчёт сдан',
  closed: 'Закрыта',
  cancelled: 'Отменена',
};

export function engineerStatusLabel(status: WorkTaskStatus): string {
  const label = engineerStatusLabels[status] ?? taskStatusLabels[status];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Отчёт и запрос к диспетчеру — пока работа не сдана: BFF принимает отчёт
// из этих статусов, возврат — из них же.
const openStatuses: WorkTaskStatus[] = ['assigned', 'engineerWorking', 'returnedToWork'];

export function isWorkOpen(status: WorkTaskStatus): boolean {
  return openStatuses.includes(status);
}

// «Приступить» — BFF: assigned / returnedToWork → engineerWorking.
export function canStartWork(status: WorkTaskStatus): boolean {
  return status === 'assigned' || status === 'returnedToWork';
}

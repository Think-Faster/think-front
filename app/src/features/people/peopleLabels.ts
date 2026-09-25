import { EngineerStatus } from '../../entities/engineer/types';
import { ScheduleStatus } from '../../entities/schedule/types';

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  working: 'рабочий',
  notWorking: 'нерабочий',
  onLeave: 'отпуск/больничный',
};

export const scheduleStatusOptions: { value: ScheduleStatus; label: string }[] = (
  Object.entries(scheduleStatusLabels) as [ScheduleStatus, string][]
).map(([value, label]) => ({ value, label }));

export const engineerStatusLabels: Record<EngineerStatus, string> = {
  available: 'доступен',
  assigned: 'назначен',
  busy: 'занят',
  unavailable: 'недоступен',
};

export const engineerStatusOptions: { value: EngineerStatus; label: string }[] = (
  Object.entries(engineerStatusLabels) as [EngineerStatus, string][]
).map(([value, label]) => ({ value, label }));

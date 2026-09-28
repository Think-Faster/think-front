import { EngineerStatus } from '../../entities/engineer/types';
import { ScheduleStatus } from '../../entities/schedule/types';
import { textChoiceOptions } from '../../shared/ui/ChoiceField';

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  working: 'рабочий',
  notWorking: 'нерабочий',
  onLeave: 'отпуск/больничный',
};

export const scheduleStatusOptions: { value: ScheduleStatus; label: string }[] = (
  Object.entries(scheduleStatusLabels) as [ScheduleStatus, string][]
).map(([value, label]) => ({ value, label }));

// Откуда строка графика смен: так подписаны строки сида (график смен, график
// отпусков); справочник открытый — ручную правку можно подписать своим.
export const scheduleSourceOptions = textChoiceOptions(['график смен', 'график отпусков']);

export const engineerStatusLabels: Record<EngineerStatus, string> = {
  available: 'доступен',
  assigned: 'назначен',
  busy: 'занят',
  unavailable: 'недоступен',
};

export const engineerStatusOptions: { value: EngineerStatus; label: string }[] = (
  Object.entries(engineerStatusLabels) as [EngineerStatus, string][]
).map(([value, label]) => ({ value, label }));

// Специальность инженера — справочник §11 доменного документа. Значения,
// которых здесь нет (записанные раньше вручную), форма сохраняет как есть.
export const engineerSpecializationLabels: Record<string, string> = {
  MAINTENANCE: 'бригада ТО',
  POWER: 'энергетик',
  COMMS: 'связь и автоматика',
  SITE_ENGINEER: 'инженер участка',
};

export const engineerSpecializationOptions: { value: string; label: string }[] = Object.entries(
  engineerSpecializationLabels
).map(([value, label]) => ({ value, label }));

export function engineerSpecializationLabel(code: string): string {
  return engineerSpecializationLabels[code] ?? code;
}

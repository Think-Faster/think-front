import { PredictionStatus, PredictionType } from '../../entities/prediction/types';

export const predictionTypeLabels: Record<PredictionType, string> = {
  fire: 'Пожар',
  gas: 'Загазованность',
  flood: 'Подтопление',
  equipmentFailure: 'Отказ оборудования',
  sensorFailure: 'Отказ датчика',
  intrusion: 'Проникновение',
};

export const predictionStatusLabels: Record<PredictionStatus, string> = {
  new: 'новый',
  inReview: 'на рассмотрении',
  taken: 'в работе',
  rejected: 'отклонён',
  muted: 'заглушен',
  closed: 'закрыт',
};

export const statusFilterOptions: { value: PredictionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'new', label: 'Новые' },
  { value: 'inReview', label: 'На рассмотрении' },
  { value: 'taken', label: 'В работе' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'muted', label: 'Заглушенные' },
  { value: 'closed', label: 'Закрытые' },
];

// В реальной модели нет поля risk — тон бейджа/акцентной полоски считаем от
// probability. Пороги (0.75/0.4) взяты на глаз, под конкретику проекта не
// калибровались — если понадобится другая шкала, менять только здесь.
export function probabilityTone(probability: number): 'high' | 'med' | 'low' {
  if (probability >= 0.75) {
    return 'high';
  }

  if (probability >= 0.4) {
    return 'med';
  }

  return 'low';
}

export function formatProbability(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

// Справочник причин отклонения — docs/backend/домены-и-сущности.md (справочники).
// Коды уходят в BFF и дальше в модель (decision.reject → reason_code, ML/INTEGRATION.md).
export const rejectReasonOptions: { value: string; label: string }[] = [
  { value: 'known_works', label: 'Известные работы на объекте' },
  { value: 'false_alarm', label: 'Ложное срабатывание датчика' },
  { value: 'seasonal', label: 'Штатное / сезонное явление' },
  { value: 'handled_elsewhere', label: 'Уже отработано другой заявкой' },
  { value: 'insufficient_data', label: 'Недостаточно данных' },
  { value: 'other', label: 'Другое' },
];

// «Другое» без комментария не принимаем — по справочнику комментарий обязателен.
export const REJECT_REASON_OTHER = 'other';

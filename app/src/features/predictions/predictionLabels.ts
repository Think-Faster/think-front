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

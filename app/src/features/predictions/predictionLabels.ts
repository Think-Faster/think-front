import { PredictionStatus, Risk } from '../../entities/prediction/types';

export const riskLabelLong: Record<Risk, string> = {
  high: 'Высокий риск',
  med: 'Средний риск',
  low: 'Наблюдение',
};

export function predictionStatusLabel(status: PredictionStatus, probability: number): string {
  if (status === 'new') {
    return `${probability}%`;
  }

  return status === 'work' ? 'в работе' : 'отклонён';
}

export const riskFilterOptions: { value: Risk | 'all'; label: string }[] = [
  { value: 'all', label: 'Все риски' },
  { value: 'high', label: 'Высокий' },
  { value: 'med', label: 'Средний' },
  { value: 'low', label: 'Наблюдение' },
];

export const statusFilterOptions: { value: PredictionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'new', label: 'Новые' },
  { value: 'work', label: 'В работе' },
  { value: 'rejected', label: 'Отклонённые' },
];

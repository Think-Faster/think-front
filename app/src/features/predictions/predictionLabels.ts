import { FactAlert, factDetails, FactDetails, TemperatureChannel } from '../../entities/factAlert/types';
import { AlertGroup, PredictionStatus, PredictionType } from '../../entities/prediction/types';

export const predictionTypeLabels: Record<PredictionType, string> = {
  fire: 'Пожар',
  gas: 'Загазованность',
  flood: 'Подтопление',
  equipmentFailure: 'Отказ оборудования',
  sensorFailure: 'Отказ датчика',
  intrusion: 'Проникновение',
  temperature: 'Аномальная температура',
  blind: 'Потеря связи или питания',
};

// Группа — справочник BFF (AlertGroup), подпись и тон чипа — здесь.
export const alertGroupLabels: Record<AlertGroup, string> = {
  accident: 'авария',
  incident: 'инцидент',
};

export const alertGroupTone: Record<AlertGroup, 'high' | 'med'> = {
  accident: 'high',
  incident: 'med',
};

export const temperatureDirectionLabels: Record<NonNullable<FactDetails['direction']>, string> = {
  cold: 'холод',
  hot: 'жара',
};

export const blindCauseLabels: Record<NonNullable<FactDetails['cause']>, string> = {
  link: 'нет связи',
  power: 'нет питания',
};

// Пометка слепоты (§13.11): объект не даёт показаний, за этим может стоять авария.
export const POSSIBLE_ACCIDENT_LABEL = 'возможна авария';

// Каналы температуры в одной строке — первые несколько, остальные числом.
const MAX_LISTED_CHANNELS = 3;

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function channelsSummary(direction: NonNullable<FactDetails['direction']>, channels: TemperatureChannel[]): string {
  const listed = channels
    .slice(0, MAX_LISTED_CHANNELS)
    .map(channel => `№${channel.sensorId}: ${formatNumber(channel.value)} °C при базе ${formatNumber(channel.baseline)} °C`);
  const rest = channels.length - listed.length;
  return [temperatureDirectionLabels[direction], ...listed, ...(rest > 0 ? [`ещё каналов: ${rest}`] : [])].join(' · ');
}

// Подробности эпизода по факту одной строкой: у температуры — каналы против
// своей базы, у слепоты — причина и доля каналов без данных, у проникновения —
// длина маршрута. Нечего сказать — null.
export function factSummary(alert: FactAlert): string | null {
  const details = factDetails(alert);
  if (alert.type === 'temperature' && details.direction) {
    return channelsSummary(details.direction, details.channels ?? []);
  }
  if (alert.type === 'fire' && details.temperature) {
    return channelsSummary(details.temperature.direction, details.temperature.channels);
  }
  if (alert.type === 'blind') {
    return [
      details.cause ? blindCauseLabels[details.cause] : null,
      details.share !== undefined ? `без данных ${Math.round(details.share * 100)}% каналов` : null,
      details.possibleAccident ? POSSIBLE_ACCIDENT_LABEL : null,
    ]
      .filter(Boolean)
      .join(' · ') || null;
  }
  if (alert.type === 'intrusion' && alert.route.length > 0) {
    return `точек маршрута: ${alert.route.length}`;
  }
  return null;
}

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

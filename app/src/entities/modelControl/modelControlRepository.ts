import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { FORECAST_TYPES, PredictionType } from '../prediction/types';
import {
  IgnoredPeriod,
  ModelBuild,
  ModelCommandAccepted,
  ModelStatus,
  OperatingShare,
  ShareEstimate,
} from './types';

// Имена типов в модели (ML/INTEGRATION.md §2.3) — те же, что BFF принимает в /model-commands/*.
const modelNames: Record<PredictionType, string> = {
  fire: 'fire',
  gas: 'gas',
  flood: 'flood',
  equipmentFailure: 'equipment',
  sensorFailure: 'sensor',
  intrusion: 'intrusion',
  temperature: 'temperature',
  blind: 'blind',
};

// Ответ модели как есть (snake_case, ключи — имена типов в модели).
interface RawStatus {
  model: { types: Record<string, { version: number | string; available: ModelBuild[] }> };
  settings: {
    version: number;
    changed: string | null;
    changed_by: string | null;
    reason: string | null;
    types: Record<string, { share: number; reject_k: number | null }>;
  };
  settings_bounds: { share: Record<string, [number, number]>; reject_k: [number, number] };
  gaps: { version: number; rows: { a: string; b: string; comment?: string | null }[] };
  retrain: { enabled: boolean; needed: boolean; reason: string | null };
}

function byType<T, R>(raw: Record<string, T>, map: (value: T) => R): Record<PredictionType, R> {
  return Object.fromEntries(
    FORECAST_TYPES.filter(type => raw[modelNames[type]] !== undefined).map(type => [type, map(raw[modelNames[type]])])
  ) as Record<PredictionType, R>;
}

export const modelControlRepository = {
  async getStatus(): Promise<ModelStatus> {
    const { data } = await apiClient.get<RawStatus>(endpoints.ml.status);

    return {
      types: byType(data.model.types, entry => ({
        current: typeof entry.version === 'number' ? entry.version : null,
        available: entry.available,
      })),
      settings: {
        version: data.settings.version,
        changed: data.settings.changed,
        changedBy: data.settings.changed_by,
        reason: data.settings.reason,
        types: byType(data.settings.types, entry => ({ share: entry.share, rejectK: entry.reject_k })),
      },
      bounds: { share: byType(data.settings_bounds.share, range => range), rejectK: data.settings_bounds.reject_k },
      gaps: {
        version: data.gaps.version,
        rows: data.gaps.rows.map(row => ({ a: row.a, b: row.b, comment: row.comment ?? '' })),
      },
      retrain: data.retrain,
    };
  },

  // «Доля часов → тревог в сутки» по истории последних 90 суток — без записи.
  async estimate(type: PredictionType, share: number): Promise<ShareEstimate> {
    const { data } = await apiClient.get<{
      share: number;
      current_share: number;
      alarms_per_day: number;
      window_days: number;
    }>(endpoints.ml.estimate, { params: { type: modelNames[type], share } });

    return {
      share: data.share,
      currentShare: data.current_share,
      alarmsPerDay: data.alarms_per_day,
      windowDays: data.window_days,
    };
  },

  async switchVersion(type: PredictionType, versionId: number | null, reason: string): Promise<ModelCommandAccepted> {
    const { data } = await apiClient.post<ModelCommandAccepted>(endpoints.bff.modelCommands.switch, {
      type: modelNames[type],
      versionId,
      reason,
    });
    return data;
  },

  // Полный снимок всех шести типов; version — следующий номер после settings.version.
  async setOperating(
    version: number,
    reason: string,
    types: Record<PredictionType, OperatingShare>
  ): Promise<ModelCommandAccepted> {
    const { data } = await apiClient.post<ModelCommandAccepted>(endpoints.bff.modelCommands.operating, {
      version,
      reason,
      types: Object.fromEntries(FORECAST_TYPES.map(type => [modelNames[type], types[type]])),
    });
    return data;
  },

  // Вся таблица игнорируемых периодов; version — следующий номер после gaps.version.
  async setGaps(version: number, reason: string, rows: IgnoredPeriod[]): Promise<ModelCommandAccepted> {
    const { data } = await apiClient.post<ModelCommandAccepted>(endpoints.bff.modelCommands.gaps, {
      version,
      reason,
      rows,
    });
    return data;
  },
};

import { PagedResult } from '../../core/api/types';
import {
  CreatePredictionDecisionRequest,
  Prediction,
  PredictionDecision,
  PredictionListItem,
  PredictionStatus,
} from './types';

interface PredictionFilter {
  objectId?: number;
  status?: PredictionStatus;
}

// TEMP TEST STUB — reverted after manual verification.
let store: Prediction[] = [
  {
    id: 'p1',
    objectId: 142,
    type: 'equipmentFailure',
    topic: 'Повреждение коллектора',
    probability: 0.87,
    hourEnd: new Date().toISOString(),
    sinceHours: 24,
    status: 'new',
    horizonHours: 24,
    score: 0.9,
    threshold: 0.5,
    alarm: true,
    confidence: 0.8,
    description: 'Зафиксирован рост температуры и изменение давления на участке.',
    classification: null,
    recommendation: 'Проверить участок 24+300–24+400 в течение 24 часов',
    modelVersionId: 'v1',
    mutedReason: null,
    factors: [
      { feature: 'temperature_delta', value: 3.1, weight: 0.6, direction: 'up' },
      { feature: 'pressure_delta', value: 0.4, weight: 0.3, direction: 'up' },
    ],
    evidence: [{ sensorId: 1, picketId: null, ts: new Date().toISOString(), value: 83.1 }],
  },
  {
    id: 'p2',
    objectId: 90,
    type: 'sensorFailure',
    topic: 'Снижение эффективности насоса',
    probability: 0.61,
    hourEnd: new Date().toISOString(),
    sinceHours: 72,
    status: 'inReview',
    horizonHours: 72,
    score: 0.6,
    threshold: 0.5,
    alarm: false,
    confidence: 0.7,
    description: null,
    classification: null,
    recommendation: 'Включить в ближайший плановый выезд',
    modelVersionId: 'v1',
    mutedReason: null,
    factors: [],
    evidence: [],
  },
];

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

export const predictionRepository = {
  async getList(filter?: PredictionFilter): Promise<PagedResult<PredictionListItem>> {
    const items = store.filter(
      p => (!filter?.objectId || p.objectId === filter.objectId) && (!filter?.status || p.status === filter.status)
    );
    return delay({ items, total: items.length, page: 1, pageSize: 50 });
  },

  async get(id: string): Promise<Prediction> {
    return delay(store.find(p => p.id === id)!);
  },

  async decide(id: string, request: CreatePredictionDecisionRequest): Promise<PredictionDecision> {
    const statusMap = { take: 'taken', reject: 'rejected', mute: 'muted', reopen: 'inReview' } as const;

    store = store.map(p =>
      p.id === id
        ? {
            ...p,
            status: statusMap[request.action],
            mutedReason: request.action === 'mute' ? request.comment ?? request.reasonCode ?? null : p.mutedReason,
          }
        : p
    );

    const decision: PredictionDecision = {
      id: `decision-${Date.now()}`,
      predictionId: id,
      userId: 'auth-1',
      action: request.action,
      reasonCode: request.reasonCode ?? null,
      comment: request.comment ?? null,
      taskId: null,
      decidedAt: new Date().toISOString(),
    };

    return delay(decision);
  },
};

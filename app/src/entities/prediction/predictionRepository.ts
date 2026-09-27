import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import {
  CreatePredictionDecisionRequest,
  Prediction,
  PredictionDecision,
  PredictionListItem,
  PredictionStatus,
} from './types';

export interface PredictionFilter extends PageRequest {
  objectId?: number;
  status?: PredictionStatus;
}

// Нет create() — в норме прогноз создаёт модель через Kafka-consumer
// (tf.forecast.results), не человек через форму в UI диспетчера. POST
// /predictions существует и работает на бэкенде (годится для тестовых
// сценариев/админки), но раз это не типовой сценарий — не оборачиваем его
// здесь; если понадобится, добавляется отдельно и осознанно.
export const predictionRepository = {
  async getList(filter?: PredictionFilter): Promise<PagedResult<PredictionListItem>> {
    const { data } = await apiClient.get<PagedResult<PredictionListItem>>(endpoints.bff.predictions.list, {
      params: filter,
    });

    return data;
  },

  async get(id: string): Promise<Prediction> {
    const { data } = await apiClient.get<Prediction>(endpoints.bff.predictions.byId(id));
    return data;
  },

  async decide(id: string, request: CreatePredictionDecisionRequest): Promise<PredictionDecision> {
    const { data } = await apiClient.post<PredictionDecision>(endpoints.bff.predictions.decisions(id), request);
    return data;
  },
};

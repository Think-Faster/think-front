import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CreateRetrainJobRequest, RetrainJob } from './types';

// Только заявка на переобучение — сам запуск делает tf-model, BFF её лишь
// фиксирует. Нет отмены/изменения статуса с фронта — этого нет в доке.
export const retrainJobRepository = {
  async getList(): Promise<RetrainJob[]> {
    const { data } = await apiClient.get<RetrainJob[]>(endpoints.bff.retrainJobs);
    return data;
  },

  async create(request: CreateRetrainJobRequest): Promise<RetrainJob> {
    const { data } = await apiClient.post<RetrainJob>(endpoints.bff.retrainJobs, request);
    return data;
  },
};

import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { Brigade, CreateBrigadeRequest } from './types';

export const brigadeRepository = {
  async getList(): Promise<Brigade[]> {
    const { data } = await apiClient.get<Brigade[]>(endpoints.bff.brigades);
    return data;
  },

  async create(request: CreateBrigadeRequest): Promise<Brigade> {
    const { data } = await apiClient.post<Brigade>(endpoints.bff.brigades, request);
    return data;
  },
};

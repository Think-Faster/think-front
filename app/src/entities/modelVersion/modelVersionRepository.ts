import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CreateModelVersionRequest, ModelVersion } from './types';

export const modelVersionRepository = {
  async getList(): Promise<ModelVersion[]> {
    const { data } = await apiClient.get<ModelVersion[]>(endpoints.bff.modelVersions.list);
    return data;
  },

  async create(request: CreateModelVersionRequest): Promise<ModelVersion> {
    const { data } = await apiClient.post<ModelVersion>(endpoints.bff.modelVersions.list, request);
    return data;
  },

  async activate(id: string): Promise<ModelVersion> {
    const { data } = await apiClient.post<ModelVersion>(endpoints.bff.modelVersions.activate(id));
    return data;
  },
};

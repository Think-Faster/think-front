import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CreateIgnoredRangeRequest, IgnoredRange } from './types';

export const ignoredRangeRepository = {
  async getList(): Promise<IgnoredRange[]> {
    const { data } = await apiClient.get<IgnoredRange[]>(endpoints.bff.ignoredRanges.list);
    return data;
  },

  async create(request: CreateIgnoredRangeRequest): Promise<IgnoredRange> {
    const { data } = await apiClient.post<IgnoredRange>(endpoints.bff.ignoredRanges.list, request);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(endpoints.bff.ignoredRanges.byId(id));
  },
};

import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { WorkScheduleEntry, WorkScheduleQuery } from './types';

export const workScheduleRepository = {
  async getList(query: WorkScheduleQuery = {}): Promise<WorkScheduleEntry[]> {
    const { data } = await apiClient.get<WorkScheduleEntry[]>(endpoints.bff.workSchedule.list, { params: query });
    return data;
  },
};

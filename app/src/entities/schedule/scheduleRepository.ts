import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CreateScheduleEntryRequest, ScheduleEntry } from './types';

export const scheduleRepository = {
  async getList(userId: string): Promise<ScheduleEntry[]> {
    const { data } = await apiClient.get<ScheduleEntry[]>(endpoints.bff.userSchedule.list(userId));
    return data;
  },

  async create(userId: string, request: CreateScheduleEntryRequest): Promise<ScheduleEntry> {
    const { data } = await apiClient.post<ScheduleEntry>(endpoints.bff.userSchedule.list(userId), request);
    return data;
  },

  async remove(userId: string, entryId: string): Promise<void> {
    await apiClient.delete(endpoints.bff.userSchedule.byId(userId, entryId));
  },
};

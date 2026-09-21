import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult } from '../../core/api/types';
import { CreateGroupRequest, GroupListItem } from './types';

export const groupRepository = {
  async getList(): Promise<PagedResult<GroupListItem>> {
    const { data } = await apiClient.get<PagedResult<GroupListItem>>(endpoints.bff.groups);
    return data;
  },

  async create(request: CreateGroupRequest): Promise<GroupListItem> {
    const { data } = await apiClient.post<GroupListItem>(endpoints.bff.groups, request);
    return data;
  },
};

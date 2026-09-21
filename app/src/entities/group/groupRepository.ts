import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult } from '../../core/api/types';
import { AddGroupMemberRequest, CreateGroupRequest, Group, GroupListItem, MemberType } from './types';

export const groupRepository = {
  async getList(): Promise<PagedResult<GroupListItem>> {
    const { data } = await apiClient.get<PagedResult<GroupListItem>>(endpoints.bff.groups.list);
    return data;
  },

  async get(id: string): Promise<Group> {
    const { data } = await apiClient.get<Group>(endpoints.bff.groups.byId(id));
    return data;
  },

  async create(request: CreateGroupRequest): Promise<GroupListItem> {
    const { data } = await apiClient.post<GroupListItem>(endpoints.bff.groups.list, request);
    return data;
  },

  async addMember(groupId: string, request: AddGroupMemberRequest): Promise<void> {
    await apiClient.post(endpoints.bff.groups.members(groupId), request);
  },

  async removeMember(groupId: string, memberType: MemberType, memberId: string): Promise<void> {
    await apiClient.delete(endpoints.bff.groups.memberById(groupId, memberType, memberId));
  },
};

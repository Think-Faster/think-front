import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult } from '../../core/api/types';
import { CreateUserRequest, UpdateUserRequest, User, UserListItem } from './types';

export const userRepository = {
  async getList(): Promise<PagedResult<UserListItem>> {
    const { data } = await apiClient.get<PagedResult<UserListItem>>(endpoints.bff.users.list);
    return data;
  },

  async create(request: CreateUserRequest): Promise<User> {
    const { data } = await apiClient.post<User>(endpoints.bff.users.list, request);
    return data;
  },

  async update(id: string, request: UpdateUserRequest): Promise<User> {
    const { data } = await apiClient.put<User>(endpoints.bff.users.byId(id), request);
    return data;
  },
};

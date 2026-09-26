import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CreateGrantRequest, Grant, PrincipalType } from './types';

export interface GrantFilter {
  principalType?: PrincipalType;
  principalId?: string;
}

export const grantRepository = {
  async getList(filter?: GrantFilter): Promise<Grant[]> {
    const { data } = await apiClient.get<Grant[]>(endpoints.bff.permissions.grants, {
      params: filter,
    });

    return data;
  },

  async upsert(request: CreateGrantRequest): Promise<Grant> {
    const { data } = await apiClient.post<Grant>(endpoints.bff.permissions.grants, request);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(endpoints.bff.permissions.grantById(id));
  },
};

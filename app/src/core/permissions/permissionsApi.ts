import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import type { PermissionAction } from './permissionService';

export interface MyPermissionsResponse {
  userId: string;
  permissions: Record<string, PermissionAction[]>;
}

export const permissionsApi = {
  async getMyPermissions(): Promise<MyPermissionsResponse> {
    const { data } = await apiClient.get<MyPermissionsResponse>(endpoints.bff.permissions.me);
    return data;
  },
};

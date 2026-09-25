import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { AssignedObject, CreateAssignedObjectRequest } from './types';

export const assignedObjectRepository = {
  async getList(userId: string): Promise<AssignedObject[]> {
    const { data } = await apiClient.get<AssignedObject[]>(endpoints.bff.userAssignedObjects.list(userId));
    return data;
  },

  async create(userId: string, request: CreateAssignedObjectRequest): Promise<AssignedObject> {
    const { data } = await apiClient.post<AssignedObject>(
      endpoints.bff.userAssignedObjects.list(userId),
      request
    );

    return data;
  },

  async remove(userId: string, objectId: number): Promise<void> {
    await apiClient.delete(endpoints.bff.userAssignedObjects.byId(userId, objectId));
  },
};

import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { Picket } from './types';

export const picketRepository = {
  // Пикеты объекта по порядку (ordinal).
  async getByObject(objectId: number): Promise<Picket[]> {
    const { data } = await apiClient.get<Picket[]>(endpoints.bff.objects.pickets(objectId));
    return data;
  },
};

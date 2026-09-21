import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { Resource } from './types';

// Только чтение существующих сущностей — создание новых (POST /resources)
// не нужно для окна конфигурации прав, туда сущности заводятся отдельно.
export const resourceRepository = {
  async getList(): Promise<Resource[]> {
    const { data } = await apiClient.get<Resource[]>(endpoints.bff.resources);
    return data;
  },
};

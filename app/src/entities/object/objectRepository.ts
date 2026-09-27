import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import { CreateObjectRequest, MapLayer, MonitoredObject, UpdateObjectRequest } from './types';

// Пикеты (/objects/{id}/pickets) сюда не входят; слои карты читает окно
// «Карта» (features/map) и рисует их своим SVG, без картографической
// библиотеки — координаты схемы в метрах, не географические.
export const objectRepository = {
  async getList(params?: { search?: string } & PageRequest): Promise<PagedResult<MonitoredObject>> {
    const { data } = await apiClient.get<PagedResult<MonitoredObject>>(endpoints.bff.objects.list, {
      params,
    });

    return data;
  },

  async getLayers(id: number, level?: number): Promise<MapLayer[]> {
    const { data } = await apiClient.get<MapLayer[]>(endpoints.bff.objects.layers(id), { params: { level } });
    return data;
  },

  async create(request: CreateObjectRequest): Promise<MonitoredObject> {
    const { data } = await apiClient.post<MonitoredObject>(endpoints.bff.objects.list, request);
    return data;
  },

  async update(id: number, request: UpdateObjectRequest): Promise<MonitoredObject> {
    const { data } = await apiClient.put<MonitoredObject>(endpoints.bff.objects.byId(id), request);
    return data;
  },
};

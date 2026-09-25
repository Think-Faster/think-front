import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult } from '../../core/api/types';
import { CreateObjectRequest, MonitoredObject, UpdateObjectRequest } from './types';

// Пикеты (/objects/{id}/pickets) и слои карты (/objects/{id}/layers) сюда
// намеренно не входят — это уже не CRUD-карточка объекта, а геометрия для
// рендера карты/схемы (нужен MapLibre/Leaflet или свой SVG-парсер GeoJSON),
// отдельная по объёму задача.
export const objectRepository = {
  async getList(params?: { search?: string }): Promise<PagedResult<MonitoredObject>> {
    const { data } = await apiClient.get<PagedResult<MonitoredObject>>(endpoints.bff.objects.list, {
      params,
    });

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

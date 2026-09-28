import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import { CreateSensorRequest, Sensor, SensorTypeOption, UpdateSensorRequest } from './types';

export interface SensorFilter extends PageRequest {
  objectId?: number;
  search?: string;
}

// /sensors/{id}/links (связи между датчиками) сюда намеренно не входит —
// топология датчиков, отдельная задача поверх этого базового CRUD.
export const sensorRepository = {
  async getList(filter?: SensorFilter): Promise<PagedResult<Sensor>> {
    const { data } = await apiClient.get<PagedResult<Sensor>>(endpoints.bff.sensors.list, {
      params: filter,
    });

    return data;
  },

  async getTypes(): Promise<SensorTypeOption[]> {
    const { data } = await apiClient.get<SensorTypeOption[]>(endpoints.bff.sensors.types);
    return data;
  },

  async create(request: CreateSensorRequest): Promise<Sensor> {
    const { data } = await apiClient.post<Sensor>(endpoints.bff.sensors.list, request);
    return data;
  },

  async update(id: number, request: UpdateSensorRequest): Promise<Sensor> {
    const { data } = await apiClient.put<Sensor>(endpoints.bff.sensors.byId(id), request);
    return data;
  },
};

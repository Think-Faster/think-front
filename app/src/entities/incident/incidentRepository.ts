import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import { ConfirmIncidentRequest, Incident } from './types';

export interface IncidentFilter extends PageRequest {
  objectId?: number;
}

// Нет create() — POST /incidents в доке единственный из всех POST-ручек
// доменного пласта без описанного тела запроса (у остальных оно либо
// показано инлайн, либо есть отдельный Create*Request-тип). Происшествие по
// смыслу — подтверждённое событие, которое логично рождается из
// прогноза/факта на бэкенде, а не заводится вручную через форму (тот же
// довод, что у predictionRepository — см. entities/prediction). Если
// понадобится ручное создание — сначала уточнить тело запроса у бэкенда, не
// гадать закрытую форму.
export const incidentRepository = {
  async getList(filter?: IncidentFilter): Promise<PagedResult<Incident>> {
    const { data } = await apiClient.get<PagedResult<Incident>>(endpoints.bff.incidents.list, {
      params: filter,
    });

    return data;
  },

  async get(id: string): Promise<Incident> {
    const { data } = await apiClient.get<Incident>(endpoints.bff.incidents.byId(id));
    return data;
  },

  async confirm(id: string, request: ConfirmIncidentRequest): Promise<Incident> {
    const { data } = await apiClient.post<Incident>(endpoints.bff.incidents.confirm(id), request);
    return data;
  },
};

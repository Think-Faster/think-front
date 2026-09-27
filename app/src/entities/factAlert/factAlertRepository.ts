import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import { FactAlert } from './types';

export interface FactAlertFilter extends PageRequest {
  objectId?: number;
}

// Только чтение: тревоги создаёт контур обработки показаний (POST
// /fact-alerts с правом predictions:create), не диспетчер.
export const factAlertRepository = {
  async getList(filter?: FactAlertFilter): Promise<PagedResult<FactAlert>> {
    const { data } = await apiClient.get<PagedResult<FactAlert>>(endpoints.bff.factAlerts, { params: filter });
    return data;
  },
};

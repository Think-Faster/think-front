import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { Coefficient, CreateCoefficientRequest } from './types';

// Нет update() — POST всегда создаёт новую версию, не редактирует
// существующую запись (см. docs/FRONTEND_INTEGRATION_DOMAIN_MODELS.md §3).
// GET отдаёт только последнюю версию на каждый type — историю смотреть
// негде, отдельной ручки на бэкенде пока нет.
export const coefficientRepository = {
  async getList(): Promise<Coefficient[]> {
    const { data } = await apiClient.get<Coefficient[]>(endpoints.bff.coefficients);
    return data;
  },

  async create(request: CreateCoefficientRequest): Promise<Coefficient> {
    const { data } = await apiClient.post<Coefficient>(endpoints.bff.coefficients, request);
    return data;
  },
};

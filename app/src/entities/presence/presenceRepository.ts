import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { Presence } from './types';

// Только чтение — ручки записи нет, присутствие фиксирует сам BFF на каждый
// аутентифицированный запрос (см. docs/FRONTEND_INTEGRATION_DOMAIN_MODELS.md
// §3).
export const presenceRepository = {
  async getList(userIds?: string[]): Promise<Presence[]> {
    const { data } = await apiClient.get<Presence[]>(endpoints.bff.presence, {
      params: userIds && userIds.length > 0 ? { userIds } : undefined,
    });

    return data;
  },
};

import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { config } from '../../core/config/config';
import { ReadingsPage, ReadingsQuery, ReadingsScope } from './types';

export const readingRepository = {
  async getScope(objectIds: number[] = []): Promise<ReadingsScope> {
    const { data } = await apiClient.get<ReadingsScope>(endpoints.bff.readingsScope, {
      params: { objectId: objectIds },
      paramsSerializer: { indexes: null },
    });
    return data;
  },

  async getLog(query: ReadingsQuery): Promise<ReadingsPage> {
    const { data } = await apiClient.get<ReadingsPage>(endpoints.funnel.log, { params: query });
    return data;
  },

  // Адрес WebSocket живого потока: тот же хост, что у API, кука входа
  // уходит с рукопожатием сама.
  streamUrl(objectId?: number): string {
    const base = new URL(config.apiBaseUrl, window.location.href);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = `${base.pathname.replace(/\/$/, '')}${endpoints.funnel.stream}`;
    if (objectId !== undefined) {
      base.searchParams.set('objectId', String(objectId));
    }
    return base.toString();
  },
};

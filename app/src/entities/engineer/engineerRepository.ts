import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { EngineerProfile, UpdateEngineerProfileRequest } from './types';

export const engineerRepository = {
  // 404 — валидный исход (профиля у пользователя ещё нет), не ошибка сети.
  // Репозиторий пробрасывает её как есть — разбирает вызывающий код через
  // parseBffError (см. features/people/hooks/useEngineerProfile.ts).
  async get(userId: string): Promise<EngineerProfile> {
    const { data } = await apiClient.get<EngineerProfile>(endpoints.bff.userEngineerProfile(userId));
    return data;
  },

  async update(userId: string, request: UpdateEngineerProfileRequest): Promise<EngineerProfile> {
    const { data } = await apiClient.put<EngineerProfile>(endpoints.bff.userEngineerProfile(userId), request);
    return data;
  },
};

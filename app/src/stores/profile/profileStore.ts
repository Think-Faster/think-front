import { create } from 'zustand';

import { userRepository } from '../../entities/user/userRepository';
import { UserListItem } from '../../entities/user/types';

interface ProfileState {
  profile: UserListItem | null;
  load: (authUserId: string) => Promise<void>;
}

// Нет отдельной ручки "мой профиль" в BFF — учётка (сервис аутентификации) и
// профиль (BFF) это разные сущности со своими id, поэтому ищем совпадение по
// authUserId в списке пользователей. Требует прав users:read и того, чтобы
// профиль попал в первую страницу списка — best effort, а не гарантия: нет
// подходящих прав или профиля не нашлось → остаёмся без него, UI (аватар,
// попап профиля) сам откатывается на данные из auth-сессии.
export const useProfileStore = create<ProfileState>(set => ({
  profile: null,

  load: async authUserId => {
    try {
      const { items } = await userRepository.getList();
      const match = items.find(user => user.authUserId === authUserId);
      set({ profile: match ?? null });
    } catch {
      set({ profile: null });
    }
  },
}));

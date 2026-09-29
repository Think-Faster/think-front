export interface GroupRef {
  id: string;
  code: string;
  name: string;
}

export interface UserListItem {
  id: string;
  authUserId: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
  // Email профиля в BFF — отдельная сущность от email учётки аутентификации
  // (CurrentUser.email/RegisterRequest.email). Нужен для отправки писем
  // через userIds (entities/notification) — без него получатель получит
  // noEmailOnFile.
  email: string | null;
  // Имя в Telegram без @, в нижнем регистре. Бот шлёт уведомления только
  // тем, кто сам нажал у него «Старт» (TelegramStatus.linked).
  telegram: string | null;
}

export interface User extends UserListItem {
  groups: GroupRef[];
}

export interface CreateUserRequest {
  authUserId: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  groupIds?: string[];
  email?: string | null;
  telegram?: string | null;
}

// groupIds сюда не входит — состав групп меняется отдельными эндпоинтами
// (см. entities/group/groupRepository.ts: addMember/removeMember).
export interface UpdateUserRequest {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  isActive: boolean;
  authUserId: string;
  email?: string | null;
  // undefined/null — не менять, '' — убрать.
  telegram?: string | null;
}

// GET/PUT /bff/users/me/telegram. linked: null — неизвестно (Redis BFF
// недоступен); bot — имя бота без @ для ссылки t.me/<bot>, null — бот ещё
// не запускался.
export interface TelegramStatus {
  username: string | null;
  linked: boolean | null;
  bot: string | null;
}

// Правила имени пользователя Telegram — как в BFF (TelegramUsername): 5–32
// символа, латиница, цифры и _, начинается с буквы; @ в начале можно.
export const TELEGRAM_USERNAME_PATTERN = '@?[A-Za-z][A-Za-z0-9_]{4,31}';

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
}

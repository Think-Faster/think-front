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
}

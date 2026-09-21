export interface GroupListItem {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

export interface CreateGroupRequest {
  code: string;
  name: string;
}

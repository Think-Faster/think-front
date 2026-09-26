export type MemberType = 'user' | 'group';

export interface GroupListItem {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

export interface GroupMember {
  type: MemberType;
  id: string;
  displayName: string;
  code?: string | null; // заполнено только когда type === 'group'
}

export interface Group extends GroupListItem {
  members: GroupMember[]; // только участники первого уровня
}

export interface CreateGroupRequest {
  code: string;
  name: string;
}

export interface AddGroupMemberRequest {
  memberId: string;
  memberType: MemberType;
}

import { ChangeEvent, useState } from 'react';

import { formatBffErrorMessage } from '../../core/errors/bffError';
import { usePermission } from '../../core/permissions/permissionService';
import { groupRepository } from '../../entities/group/groupRepository';
import { GroupMember } from '../../entities/group/types';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useGroupMembers } from './hooks/useGroupMembers';
import { useGroups } from './hooks/useGroups';
import { useUsers } from '../users/hooks/useUsers';

interface GroupMembersEditorProps {
  groupId: string;
}

export default function GroupMembersEditor({ groupId }: GroupMembersEditorProps) {
  const { group, loading, error, reload } = useGroupMembers(groupId);
  const { users } = useUsers();
  const { groups } = useGroups();
  const canManage = usePermission('groups', 'update');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [addError, setAddError] = useState('');

  async function addMember(memberId: string, memberType: 'user' | 'group') {
    setAddError('');

    try {
      await groupRepository.addMember(groupId, { memberId, memberType });
      setSelectedUserId('');
      setSelectedGroupId('');
      reload();
    } catch (err) {
      setAddError(formatBffErrorMessage(err, 'Не удалось добавить участника.'));
    }
  }

  async function removeMember(member: GroupMember) {
    setAddError('');

    try {
      await groupRepository.removeMember(groupId, member.type, member.id);
      reload();
    } catch (err) {
      setAddError(formatBffErrorMessage(err, 'Не удалось убрать участника.'));
    }
  }

  const nestableGroups = groups.filter(candidate => candidate.id !== groupId);

  return (
    <div>
      <p className="pd-section-title">Участники группы</p>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && group?.members.length === 0 && <EmptyState>Участников пока нет</EmptyState>}

      {group?.members.map(member => (
        <div className="hist-item" key={`${member.type}-${member.id}`}>
          <span>
            {member.displayName}
            {member.type === 'group' ? ` · группа${member.code ? ` (${member.code})` : ''}` : ''}
          </span>

          {canManage && (
            <button className="win-close" onClick={() => removeMember(member)} title="Убрать из группы">
              ×
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <>
          <p className="pd-section-title">Добавить участника</p>

          {addError && <div className="login-error">{addError}</div>}

          <form className="login-form" onSubmit={event => event.preventDefault()}>
            <label>
              Пользователь
              <select
                value={selectedUserId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedUserId(event.target.value)}
              >
                <option value="">— выбрать —</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.lastName} {user.firstName}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              disabled={!selectedUserId}
              onClick={() => addMember(selectedUserId, 'user')}
            >
              Добавить пользователя
            </Button>

            <label>
              Группа
              <select
                value={selectedGroupId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedGroupId(event.target.value)}
              >
                <option value="">— выбрать —</option>
                {nestableGroups.map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              disabled={!selectedGroupId}
              onClick={() => addMember(selectedGroupId, 'group')}
            >
              Добавить группу
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';

import Badge from '../../shared/ui/Badge';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useUsers } from '../users/hooks/useUsers';
import AssignedObjectsTab from './AssignedObjectsTab';
import EngineerTab from './EngineerTab';
import { usePresence } from './hooks/usePresence';
import ScheduleTab from './ScheduleTab';

type PeopleTab = 'schedule' | 'objects' | 'engineer';

const tabOptions: { value: PeopleTab; label: string }[] = [
  { value: 'schedule', label: 'График' },
  { value: 'objects', label: 'Объекты' },
  { value: 'engineer', label: 'Инженер' },
];

export default function PeopleWindow() {
  const { users } = useUsers();
  const [userId, setUserId] = useState('');
  const [tab, setTab] = useState<PeopleTab>('schedule');
  const { presence } = usePresence(userId || undefined);

  return (
    <div className="pd-body">
      <label>
        Сотрудник
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={userId} onChange={event => setUserId(event.target.value)}>
            <option value="">— выбрать —</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.lastName} {user.firstName}
              </option>
            ))}
          </select>

          {presence && (
            <Badge tone={presence.isOnline ? 'low' : 'med'}>{presence.isOnline ? 'онлайн' : 'офлайн'}</Badge>
          )}
        </span>
      </label>

      {!userId ? (
        <EmptyState>Выберите сотрудника</EmptyState>
      ) : (
        <>
          <div className="win-toolbar">
            <ChipFilterGroup options={tabOptions} value={tab} onChange={setTab} />
          </div>

          {tab === 'schedule' && <ScheduleTab userId={userId} />}
          {tab === 'objects' && <AssignedObjectsTab userId={userId} />}
          {tab === 'engineer' && <EngineerTab userId={userId} />}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';

import GroupsPanel from '../groups/GroupsPanel';
import UsersPanel from '../users/UsersPanel';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';

type AccessTab = 'users' | 'groups';

const tabOptions: { value: AccessTab; label: string }[] = [
  { value: 'users', label: 'Пользователи' },
  { value: 'groups', label: 'Группы' },
];

export default function AccessWindow() {
  const [tab, setTab] = useState<AccessTab>('users');

  return (
    <>
      <div className="win-toolbar">
        <ChipFilterGroup options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab === 'users' ? <UsersPanel /> : <GroupsPanel />}
    </>
  );
}

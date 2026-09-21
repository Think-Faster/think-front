import { useRef, useState } from 'react';

import { CurrentUser } from '../../core/auth/types';
import { UserListItem } from '../../entities/user/types';
import { useDismiss } from '../../shared/hooks/useDismiss';
import { useAuthStore } from '../../stores/auth/authStore';
import { useProfileStore } from '../../stores/profile/profileStore';

function getInitials(profile: UserListItem | null, user: CurrentUser | null): string {
  if (profile?.lastName && profile?.firstName) {
    return `${profile.lastName[0]}${profile.firstName[0]}`.toUpperCase();
  }

  if (user?.email) {
    return user.email.slice(0, 2).toUpperCase();
  }

  return '';
}

export default function UserMenu() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const profile = useProfileStore(state => state.profile);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss(containerRef, () => setOpen(false), open);

  function handleLogout() {
    setOpen(false);
    logout();
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button className="avatar" onClick={() => setOpen(current => !current)}>
        {getInitials(profile, user)}
      </button>

      {open && (
        <div className="user-menu-popover">
          <div className="user-menu-name">{user?.userName ?? 'Неизвестный пользователь'}</div>
          <div className="user-menu-email">{user?.email ?? '—'}</div>

          <div className="user-menu-id">
            ID учётной записи: <span className="mono">{user?.id ?? '—'}</span>
          </div>

          <div className="user-menu-id">
            ID профиля: <span className="mono">{profile?.id ?? '—'}</span>
          </div>

          <button className="btn user-menu-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

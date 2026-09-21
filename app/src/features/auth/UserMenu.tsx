import { useRef, useState } from 'react';

import { useDismiss } from '../../shared/hooks/useDismiss';
import { useAuthStore } from '../../stores/auth/authStore';

interface UserMenuProps {
  initials: string;
}

export default function UserMenu({ initials }: UserMenuProps) {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss(containerRef, () => setOpen(false), open);

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button className="avatar" onClick={() => setOpen(current => !current)}>
        {initials}
      </button>

      {open && (
        <div className="user-menu-popover">
          <div className="user-menu-name">{user?.userName ?? 'Неизвестный пользователь'}</div>
          <div className="user-menu-email">{user?.email ?? '—'}</div>

          <button className="btn user-menu-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

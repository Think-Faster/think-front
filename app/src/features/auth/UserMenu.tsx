import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CurrentUser } from '../../core/auth/types';
import { SectionDefinition, visibleSections } from '../../core/registry/sectionRegistry';
import { UserListItem } from '../../entities/user/types';
import { useDismiss } from '../../shared/hooks/useDismiss';
import { useAuthStore } from '../../stores/auth/authStore';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
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

// Раздел, в котором пользователь сейчас: самый длинный совпавший путь
// (у рабочей области путь «/» — она же всё, что не попало в другие).
function currentSection(sections: SectionDefinition[], pathname: string): SectionDefinition | undefined {
  return sections
    .filter(section => section.path === '/' || pathname === section.path || pathname.startsWith(`${section.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export default function UserMenu() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const profile = useProfileStore(state => state.profile);
  const permissions = usePermissionsStore(state => state.map);
  const { pathname } = useLocation();
  const sections = visibleSections(permissions);
  const here = currentSection(sections, pathname);
  const others = sections.filter(section => section !== here);

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
            <div className="field-label">ID учётной записи</div>
            <div className="user-menu-id-value mono">{user?.id ?? '—'}</div>
          </div>

          <div className="user-menu-id">
            <div className="field-label">ID профиля</div>
            <div className="user-menu-id-value mono">{profile?.id ?? '—'}</div>
          </div>

          {others.map(section => (
            <Link key={section.id} className="btn user-menu-section" to={section.path} onClick={() => setOpen(false)}>
              {section.title}
            </Link>
          ))}

          <button className="btn user-menu-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

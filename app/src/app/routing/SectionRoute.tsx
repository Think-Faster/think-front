import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { findSection, visibleSections } from '../../core/registry/sectionRegistry';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';

const NARROW_SCREEN = '(max-width: 767px)';

// Первый раздел после входа уже выбран — дальше переход между разделами
// делает сам пользователь (меню профиля), и телефон его не перебивает.
let landed = false;

// Раздел верхнего уровня (core/registry/sectionRegistry.ts): без прав на
// него — переход в первый доступный; на узком экране при первом входе —
// в раздел для телефона, если он доступен. Пока права не пришли, раздел
// рисуется как есть: окна и шторка сами скрывают то, на что прав нет.
export default function SectionRoute({ sectionId }: { sectionId: string }) {
  const permissions = usePermissionsStore(state => state.map);
  const groups = usePermissionsStore(state => state.groups);
  const status = usePermissionsStore(state => state.status);
  const location = useLocation();
  const [firstLanding] = useState(() => !landed);

  useEffect(() => {
    landed = true;
  }, []);

  const section = findSection(sectionId);
  if (status !== 'ready' || !section) {
    return <Outlet />;
  }

  const access = { permissions, groups };
  const visible = visibleSections(access);

  if (!section.isVisible(access)) {
    const fallback = visible[0];
    return fallback ? <Navigate to={fallback.path} replace /> : <Outlet />;
  }

  if (firstLanding && location.pathname === section.path && !section.mobile && window.matchMedia(NARROW_SCREEN).matches) {
    const mobile = visible.find(item => item.mobile);
    if (mobile) {
      return <Navigate to={mobile.path} replace />;
    }
  }

  return <Outlet />;
}

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { deserializeWorkspace, serializeWorkspace } from '../../core/workspace/workspaceUrlSerializer';
import { useWindowsStore } from '../../stores/workspace/windowsStore';

// Keeps the Workspace URL ↔ Store sync one-directional per tick: the URL is
// read once on mount, then the store becomes the source of truth and is
// mirrored back into the URL (архитектура §27 — avoids URL → Store → URL loops).
export function useWorkspaceUrlSync() {
  const windows = useWindowsStore(state => state.windows);
  const applyOpenState = useWindowsStore(state => state.applyOpenState);

  const navigate = useNavigate();
  const location = useLocation();
  const appliedFromUrl = useRef(false);

  useEffect(() => {
    if (appliedFromUrl.current) {
      return;
    }

    appliedFromUrl.current = true;

    const parsed = deserializeWorkspace(location.search);
    if (parsed) {
      applyOpenState(parsed.openIds, parsed.activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appliedFromUrl.current) {
      return;
    }

    const params = serializeWorkspace(windows);
    const nextSearch = params.toString() ? `?${params.toString()}` : '';

    if (nextSearch !== location.search) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [windows, location.pathname, location.search, navigate]);
}

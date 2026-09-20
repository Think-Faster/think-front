import { WindowRuntimeState } from '../../stores/workspace/windowsStore';

export interface WorkspaceUrlState {
  openIds: string[];
  activeId?: string;
}

export function serializeWorkspace(windows: WindowRuntimeState[]): URLSearchParams {
  const params = new URLSearchParams();
  const open = windows.filter(window => window.open);

  if (open.length > 0) {
    params.set('windows', open.map(window => window.id).join(','));

    const active = open.reduce((a, b) => (b.z > a.z ? b : a));
    params.set('active', active.id);
  }

  return params;
}

export function deserializeWorkspace(search: string): WorkspaceUrlState | null {
  const params = new URLSearchParams(search);
  const windowsParam = params.get('windows');

  if (!windowsParam) {
    return null;
  }

  return {
    openIds: windowsParam.split(',').filter(Boolean),
    activeId: params.get('active') ?? undefined,
  };
}

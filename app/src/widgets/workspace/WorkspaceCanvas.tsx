import { windowRegistry } from '../../core/registry/windowRegistry';
import Window from '../../shared/ui/Window';
import { useWindowsStore } from '../../stores/workspace/windowsStore';
import { useWorkspaceUrlSync } from './useWorkspaceUrlSync';

export default function WorkspaceCanvas() {
  useWorkspaceUrlSync();

  const windows = useWindowsStore(state => state.windows);
  const focusWindow = useWindowsStore(state => state.focusWindow);
  const updateWindow = useWindowsStore(state => state.updateWindow);

  return (
    <div className="canvas-inner">
      {windowRegistry.map(definition => {
        const state = windows.find(window => window.id === definition.id);
        if (!state?.open) {
          return null;
        }

        const Content = definition.component;

        return (
          <Window
            key={definition.id}
            title={definition.title}
            x={state.x}
            y={state.y}
            width={state.width}
            height={state.height}
            zIndex={state.z}
            onFocus={() => focusWindow(definition.id)}
            onMove={(x, y) => updateWindow(definition.id, { x, y })}
            onResize={(width, height) => updateWindow(definition.id, { width, height })}
            onClose={() => updateWindow(definition.id, { open: false })}
          >
            <Content />
          </Window>
        );
      })}
    </div>
  );
}

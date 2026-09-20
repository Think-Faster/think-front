import { windowRegistry } from '../../core/registry/windowRegistry';
import { useWindowsStore } from '../../stores/workspace/windowsStore';

export default function WindowToolbar() {
  const windows = useWindowsStore(state => state.windows);
  const toggleWindow = useWindowsStore(state => state.toggleWindow);

  return (
    <div className="toolbar">
      <span className="tb-label">Окна:</span>

      {windowRegistry.map(definition => {
        const state = windows.find(window => window.id === definition.id);

        return (
          <button
            key={definition.id}
            className={`win-chip ${state?.open ? 'on' : ''}`}
            onClick={() => toggleWindow(definition.id)}
          >
            {definition.title}
          </button>
        );
      })}

      <span className="hint">Заголовок — перетащить · угол — изменить размер</span>
    </div>
  );
}

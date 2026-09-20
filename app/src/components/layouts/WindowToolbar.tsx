import { useWindowManager } from '../windows/WindowManager';

export default function WindowToolbar() {
  const {
    windows,
    toggleWindow,
  } = useWindowManager();

  return (
    <div className="toolbar">

      <span className="tb-label">
        Окна:
      </span>

      {windows.map(window => (
        <button
          key={window.id}
          className={
            `win-chip ${
              window.open ? 'on' : ''
            }`
          }
          onClick={() =>
            toggleWindow(window.id)
          }
        >
          {window.title}
        </button>
      ))}

      <span className="hint">
        Заголовок — перетащить · угол —
        изменить размер
      </span>

    </div>
  );
}
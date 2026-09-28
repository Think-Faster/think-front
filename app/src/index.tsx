import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import './styles/index.css';
// Тема ставится до первого рендера, чтобы экран входа не мигал светлым.
import './stores/theme/themeStore';
import App from './app/App';
import { config } from './core/config/config';

// Название во вкладке — из конфига (REACT_APP_APP_NAME), index.html держит
// то же имя до загрузки скрипта.
document.title = config.appName;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
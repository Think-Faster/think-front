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

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
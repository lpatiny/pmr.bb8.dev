import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { setupServiceWorker } from './pwa.ts';
import './index.css';

setupServiceWorker();

const container = document.querySelector('#root');
if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

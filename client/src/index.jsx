import React from 'react';
import { createRoot } from 'react-dom/client';
import AppProviders from './app/providers';
import App from './app/App';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);

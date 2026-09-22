import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { KeycloakProvider } from './auth/KeycloakProvider';
import { AdminGate } from './auth/AdminGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeycloakProvider>
      <AdminGate>
        <div>DrinkSaver Admin</div>
      </AdminGate>
    </KeycloakProvider>
  </StrictMode>
);
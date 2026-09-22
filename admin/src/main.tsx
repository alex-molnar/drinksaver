import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AdminGate } from './auth/AdminGate';
import { KeycloakProvider } from './auth/KeycloakProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeycloakProvider>
      <AdminGate>
        <div>DrinkSaver Admin</div>
      </AdminGate>
    </KeycloakProvider>
  </StrictMode>
);

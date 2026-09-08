import { createContext } from 'react';
import type Keycloak from 'keycloak-js';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | undefined;
  userId: string | undefined;
  username: string | undefined;
  login: () => void;
  logout: () => void;
  keycloak: Keycloak;
}

export const AuthContext = createContext<AuthContextType | null>(null);

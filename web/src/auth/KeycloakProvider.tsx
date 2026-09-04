import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import type Keycloak from 'keycloak-js';
import keycloak from './keycloak';

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

interface KeycloakProviderProps {
  children: React.ReactNode;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (didInit.current) return;
    didInit.current = true;

    const initKeycloak = async () => {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        setIsAuthenticated(authenticated);

        // Set up token refresh
        if (authenticated) {
          // Refresh token before it expires
          setInterval(() => {
            keycloak.updateToken(70).catch(() => {
              console.warn('Failed to refresh token, logging out');
              keycloak.logout();
            });
          }, 60000); // Check every minute
        }
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initKeycloak();
  }, []);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    token: keycloak.token,
    userId: keycloak.tokenParsed?.sub,
    username: keycloak.tokenParsed?.preferred_username,
    login,
    logout,
    keycloak,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default KeycloakProvider;

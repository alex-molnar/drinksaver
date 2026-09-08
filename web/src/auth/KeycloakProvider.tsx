import React, { useEffect, useState, useCallback, useRef } from 'react';
import keycloak from './keycloak';
import { AuthContext, type AuthContextType } from './AuthContext';

interface KeycloakProviderProps {
  children: React.ReactNode;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didInit = useRef(false);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (!didInit.current) {
      didInit.current = true;
      initKeycloak();
    }

    // Deliberately outside the guard above. The interval is created after
    // keycloak.init resolves, which is after Strict Mode has already double-invoked
    // this effect, so a cleanup returned from inside the guarded branch would be the
    // early return's undefined on the second pass and would never clear anything.
    // Reading the ref here means the first pass's cleanup is a no-op and the second
    // one, the only cleanup React keeps, clears the live interval on unmount.
    return () => {
      clearInterval(refreshInterval.current);
      refreshInterval.current = undefined;
    };

    async function initKeycloak() {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        setIsAuthenticated(authenticated);

        // Refresh the token a little before it expires
        if (authenticated) {
          refreshInterval.current = setInterval(() => {
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
    }
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

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import keycloak from './keycloak';
import { AuthContext } from './AuthContext';
import { isAdmin as hasAdminGroup } from './adminGroup';

/**
 * Initializes the configured Keycloak client, requires login, and exposes the
 * access token identity and admin group status to descendants. `children` is
 * rendered while auth loads; consumers should use AdminGate to restrict it.
 */
export const KeycloakProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const initialized = useRef(false);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void initialize();
    }

    return () => {
      clearInterval(refreshInterval.current);
      refreshInterval.current = undefined;
    };

    async function initialize() {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });
        setIsAuthenticated(authenticated);
        setIsAdmin(authenticated && hasAdminGroup(keycloak.tokenParsed?.groups));
        if (authenticated) {
          refreshInterval.current = setInterval(() => {
            keycloak.updateToken(70).catch(() => {
              console.warn('Failed to refresh token, logging out');
              keycloak.logout();
            });
          }, 60_000);
        }
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const login = useCallback(() => { void keycloak.login(); }, []);
  const logout = useCallback(() => { void keycloak.logout({ redirectUri: window.location.origin }); }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isAdmin,
        token: keycloak.token,
        userId: keycloak.tokenParsed?.sub,
        username: keycloak.tokenParsed?.preferred_username,
        login,
        logout,
        keycloak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

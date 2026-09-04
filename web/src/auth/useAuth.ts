import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './KeycloakProvider';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within a KeycloakProvider');
  }
  
  return context;
};

export default useAuth;

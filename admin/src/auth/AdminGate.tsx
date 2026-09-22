import type { ReactNode } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from './useAuth';

/**
 * Renders the application only for a member of the Keycloak admin group.
 *
 * A refused session renders nothing else: no navigation, no queries. Without that,
 * every list in the shell would fire and fail, and a wall of 403 toasts is a much
 * worse answer to "you are not an administrator" than one sentence saying so.
 *
 * This is a user experience guard, not a security control. The backend rejects
 * /v1/admin/** for a non-member regardless of what this component decides.
 */
export const AdminGate = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAdmin, username, logout } = useAuth();

  if (isLoading) {
    return (
      <Box
        role="status"
        aria-label="Signing in"
        sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 3 }}>
        {/* System props went away in MUI 9: layout belongs in sx, not on the component. */}
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
          <Typography variant="h5" component="h1">
            Not authorised
          </Typography>
          <Typography color="text.secondary">
            {username ? `${username} is not` : 'This account is not'} a member of the admin
            group, so the DrinkSaver admin panel is not available. Ask an administrator to add
            you, then sign in again.
          </Typography>
          <Button variant="outlined" onClick={logout}>
            Sign out
          </Button>
        </Stack>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AdminGate;

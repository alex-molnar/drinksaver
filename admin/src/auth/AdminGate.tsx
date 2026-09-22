import { Box, Button, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

/** `children` is shown to authenticated admins; loading and denied sessions get a status screen. */
export const AdminGate = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, isAdmin, logout } = useAuth();

  if (isLoading) {
    return (
      <Box role="status" sx={{ minHeight: '100vh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2 }}>
        <CircularProgress aria-label="Loading" />
        <Typography>Loading your account…</Typography>
      </Box>
    );
  }

  if (isAuthenticated && isAdmin) return <>{children}</>;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2, p: 3 }}>
      <Typography component="h1" variant="h5">Admin access required</Typography>
      <Typography color="text.secondary">Your account is not a member of the admin group.</Typography>
      {isAuthenticated && <Button variant="contained" onClick={logout}>Sign out</Button>}
    </Box>
  );
};

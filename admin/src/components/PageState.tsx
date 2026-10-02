import type { ReactNode } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';

export interface PageStateProps {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  filteredEmpty?: boolean;
  onRetry?: () => void;
  emptyAction?: ReactNode;
  children: ReactNode;
}

export const PageState = ({ loading, error, empty, filteredEmpty, onRetry, emptyAction, children }: PageStateProps) => {
  if (loading) return <div className="page-state" role="status" aria-label="Loading"><span className="spinner" />Loading</div>;
  if (error) return <Alert severity="error" role="alert" action={onRetry ? <Button color="inherit" onClick={onRetry}>Retry</Button> : undefined}>{error}</Alert>;
  if (empty) return (
    <Stack className="page-state" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="h6">{filteredEmpty ? 'No entries match your search' : 'Nothing here yet'}</Typography>
      {!filteredEmpty && emptyAction}
    </Stack>
  );
  return <>{children}</>;
};

export default PageState;

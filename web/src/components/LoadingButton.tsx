import React from 'react';
import { Button, type ButtonProps, CircularProgress } from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  disabled,
  children,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      sx={{
        minHeight: 48,
        minWidth: 120,
        ...props.sx,
      }}
    >
      {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
};

export default LoadingButton;

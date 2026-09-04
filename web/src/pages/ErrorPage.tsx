import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button, Grow } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import type { ErrorPageState } from '../types/api';

const ErrorPage: React.FC = () => {
  const location = useLocation();
  const { navigateToHome } = useAppNavigation();
  const state = location.state as ErrorPageState | null;

  const message = state?.message || 'An unexpected error occurred.';

  const handleRetry = () => {
    window.history.back();
  };

  return (
    <Layout title="Error" hideBottomNav>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          px: 2,
        }}
      >
        <Grow in timeout={400}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              borderRadius: 4,
              width: '100%',
              maxWidth: 340,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 20px rgba(229, 57, 53, 0.4)',
              }}
            >
              <ErrorIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: 'error.dark', mb: 1.5 }}
            >
              Oops!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {message}
            </Typography>
          </Paper>
        </Grow>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 200 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={navigateToHome}
            startIcon={<HomeIcon />}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Back to Home
          </Button>
        </Box>
      </Box>
    </Layout>
  );
};

export default ErrorPage;

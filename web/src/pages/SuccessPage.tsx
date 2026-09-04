import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button, Grow } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import type { SuccessPageState } from '../types/api';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { navigateToHome } = useAppNavigation();
  const state = location.state as SuccessPageState | null;

  const message = state?.message || 'Operation completed successfully!';

  return (
    <Layout title="Success" hideBottomNav>
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
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
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
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 20px rgba(67, 160, 71, 0.4)',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: 'success.dark', mb: 1.5 }}
            >
              Cheers! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {message}
            </Typography>
          </Paper>
        </Grow>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={navigateToHome}
          startIcon={<HomeIcon />}
          sx={{
            minWidth: 200,
            py: 1.5,
            px: 4,
          }}
        >
          Back to Home
        </Button>
      </Box>
    </Layout>
  );
};

export default SuccessPage;

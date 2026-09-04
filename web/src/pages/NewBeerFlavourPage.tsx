import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Alert,
  Paper,
  Typography,
  Fab,
  Zoom,
  CircularProgress,
  Button,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import { createBeerFlavour } from '../api/endpoints';
import type { NewBeerFlavourPageState } from '../types/api';

const NewBeerFlavourPage: React.FC = () => {
  const location = useLocation();
  const { navigateToSuccess, navigateToError, navigateToHome } = useAppNavigation();
  const state = location.state as NewBeerFlavourPageState | null;

  // Form state
  const [flavourName, setFlavourName] = useState('');
  const [saving, setSaving] = useState(false);

  // Redirect if no state provided
  if (!state) {
    return (
      <Layout title="New Beer Flavour" showBackButton hideBottomNav>
        <Box sx={{ py: 2 }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            Missing beer brand information. Please go back and try again.
          </Alert>
          <Button variant="contained" onClick={navigateToHome} fullWidth>
            Back to Home
          </Button>
        </Box>
      </Layout>
    );
  }

  const { brandId, brandName } = state;

  const isFormValid = () => {
    return flavourName.trim().length > 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    try {
      await createBeerFlavour(brandId, flavourName.trim());
      navigateToSuccess(`Flavour "${flavourName}" has been created for ${brandName}!`);
    } catch (error) {
      console.error('Failed to create beer flavour:', error);
      navigateToError('Failed to create beer flavour. Please try again.');
    }
  }, [brandId, brandName, flavourName, navigateToSuccess, navigateToError]);

  return (
    <Layout title="New Beer Flavour" showBackButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Info Alert */}
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Adding a new flavour/taste for <strong>{brandName}</strong>
        </Alert>

        {/* Flavour Details */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <SportsBarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Flavour Details
            </Typography>
          </Box>

          <TextField
            label="Flavour/Taste Name"
            value={flavourName}
            onChange={(e) => setFlavourName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Original, Light, IPA, Lager"
          />
        </Paper>
      </Box>

      {/* Floating Action Button */}
      <Zoom in={isFormValid()}>
        <Fab
          color="primary"
          onClick={handleSubmit}
          disabled={saving || !isFormValid()}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            zIndex: 1200,
          }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
        </Fab>
      </Zoom>
    </Layout>
  );
};

export default NewBeerFlavourPage;

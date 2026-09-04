import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  InputAdornment,
  Alert,
  Paper,
  Typography,
  Fab,
  Zoom,
  CircularProgress,
  Button,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import StraightenIcon from '@mui/icons-material/Straighten';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import { createVolumeForAlcoholType } from '../api/endpoints';
import type { NewVolumePageState } from '../types/api';

const NewVolumePage: React.FC = () => {
  const location = useLocation();
  const { navigateToSuccess, navigateToError, navigateToHome } = useAppNavigation();
  const state = location.state as NewVolumePageState | null;

  // Form state
  const [volumeName, setVolumeName] = useState('');
  const [volumeValue, setVolumeValue] = useState('');
  const [volumeError, setVolumeError] = useState('');
  const [saving, setSaving] = useState(false);

  // Redirect if no state provided
  if (!state) {
    return (
      <Layout title="New Volume" showBackButton hideBottomNav>
        <Box sx={{ py: 2 }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            Missing alcohol type information. Please go back and try again.
          </Alert>
          <Button variant="contained" onClick={navigateToHome} fullWidth>
            Back to Home
          </Button>
        </Box>
      </Layout>
    );
  }

  const { alcoholTypeId, alcoholTypeName } = state;

  // Check if volume value is valid (pure function, no side effects)
  const isVolumeValid = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && num < 2;
  };

  // Validate volume value and update error state (use only in event handlers)
  const validateVolume = (value: string): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setVolumeError('Please enter a valid number');
      return false;
    }
    if (num <= 0) {
      setVolumeError('Volume must be positive');
      return false;
    }
    if (num >= 2) {
      setVolumeError('Volume must be less than 2 liters');
      return false;
    }
    setVolumeError('');
    return true;
  };

  const handleVolumeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVolumeValue(value);
    if (value) {
      validateVolume(value);
    } else {
      setVolumeError('');
    }
  };

  const isFormValid = () => {
    return (
      volumeName.trim().length > 0 &&
      volumeValue.trim().length > 0 &&
      !volumeError &&
      isVolumeValid(volumeValue)
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    const saveOperation = async () => {
      await createVolumeForAlcoholType(alcoholTypeId, {
        name: volumeName.trim(),
        volume: parseFloat(volumeValue),
      });
    };

    try {
      await saveOperation();
      navigateToSuccess(`Volume "${volumeName}" has been added to ${alcoholTypeName}!`);
    } catch (error) {
      console.error('Failed to create volume:', error);
      navigateToError('Failed to create volume. Please try again.');
    }
  }, [volumeName, volumeValue, alcoholTypeId, alcoholTypeName, navigateToSuccess, navigateToError]);

  return (
    <Layout title="New Volume" showBackButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Info message */}
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            bgcolor: 'primary.light',
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' },
          }}
        >
          Adding volume for <strong>{alcoholTypeName}</strong>
        </Alert>

        {/* Volume Details */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <StraightenIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Volume Details
            </Typography>
          </Box>

          <TextField
            label="Volume Name"
            value={volumeName}
            onChange={(e) => setVolumeName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Pint, Shot, Glass"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Volume in Liters"
            value={volumeValue}
            onChange={handleVolumeValueChange}
            fullWidth
            required
            type="number"
            error={!!volumeError}
            helperText={volumeError || 'Enter a positive number less than 2'}
            placeholder="e.g., 0.5"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">L</InputAdornment>,
              },
              htmlInput: { step: 0.01, min: 0.01, max: 1.99 },
            }}
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

export default NewVolumePage;

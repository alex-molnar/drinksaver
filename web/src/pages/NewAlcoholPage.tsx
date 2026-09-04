import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Chip,
  InputAdornment,
  Paper,
  Fab,
  Zoom,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import { createAlcoholType } from '../api/endpoints';
import type { NewVolumeEntry } from '../types/api';

const NewAlcoholPage: React.FC = () => {
  const { navigateToSuccess, navigateToError } = useAppNavigation();

  // Form state
  const [alcoholName, setAlcoholName] = useState('');
  const [volumeName, setVolumeName] = useState('');
  const [volumeValue, setVolumeValue] = useState('');
  const [volumeError, setVolumeError] = useState('');
  const [volumes, setVolumes] = useState<NewVolumeEntry[]>([]);
  const [subtypeName, setSubtypeName] = useState('');
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Validate volume value (positive, < 2)
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

  const handleAddVolume = () => {
    if (!volumeName.trim() || !volumeValue.trim()) return;
    if (!validateVolume(volumeValue)) return;

    const newVolume: NewVolumeEntry = {
      name: volumeName.trim(),
      volume: parseFloat(volumeValue),
    };

    setVolumes([...volumes, newVolume]);
    setVolumeName('');
    setVolumeValue('');
    setVolumeError('');
  };

  const handleRemoveVolume = (index: number) => {
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  const handleAddSubtype = () => {
    if (!subtypeName.trim()) return;
    setSubtypes([...subtypes, subtypeName.trim()]);
    setSubtypeName('');
  };

  const handleRemoveSubtype = (index: number) => {
    setSubtypes(subtypes.filter((_, i) => i !== index));
  };

  const canAddSubtype = subtypeName.trim().length > 0;

  const isFormValid = () => {
    return alcoholName.trim().length > 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    const saveOperation = async () => {
      await createAlcoholType({
        name: alcoholName.trim(),
        volumes: volumes.length > 0 ? volumes : undefined,
        alcoholSubtypes: subtypes.length > 0 ? subtypes : undefined,
      });
    };

    try {
      await saveOperation();
      navigateToSuccess(`Alcohol type "${alcoholName}" has been created!`);
    } catch (error) {
      console.error('Failed to create alcohol type:', error);
      navigateToError('Failed to create alcohol type. Please try again.');
    }
  }, [alcoholName, volumes, subtypes, navigateToSuccess, navigateToError]);

  const canAddVolume = volumeName.trim() && volumeValue.trim() && !volumeError;

  return (
    <Layout title="New Alcohol Type" showBackButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Section 1: Alcohol Name */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <LocalBarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Alcohol Details
            </Typography>
          </Box>

          <TextField
            label="Alcohol Type Name"
            value={alcoholName}
            onChange={(e) => setAlcoholName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Whiskey, Wine, Vodka"
          />
        </Paper>

        {/* Section 2: Volumes */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Volumes (optional)
          </Typography>

          {/* Added Volumes Display */}
          {volumes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {volumes.map((vol, index) => (
                  <Chip
                    key={index}
                    label={`${vol.name} (${vol.volume}L)`}
                    onDelete={() => handleRemoveVolume(index)}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Volume Input */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Name"
              value={volumeName}
              onChange={(e) => setVolumeName(e.target.value)}
              placeholder="e.g., Shot"
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Liters"
              value={volumeValue}
              onChange={handleVolumeValueChange}
              placeholder="0.5"
              type="number"
              size="small"
              error={!!volumeError}
              helperText={volumeError}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">L</InputAdornment>,
                },
                htmlInput: { step: 0.01, min: 0.01, max: 1.99 },
              }}
              sx={{ flex: 1 }}
            />
            <IconButton
              color="primary"
              onClick={handleAddVolume}
              disabled={!canAddVolume}
              sx={{
                mt: 0.5,
                minWidth: 48,
                minHeight: 48,
                bgcolor: canAddVolume ? 'primary.light' : 'grey.200',
                color: canAddVolume ? 'white' : 'grey.500',
                '&:hover': { bgcolor: canAddVolume ? 'primary.main' : 'grey.200' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Section 3: Subtypes */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Subtypes (optional)
          </Typography>

          {/* Added Subtypes Display */}
          {subtypes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {subtypes.map((subtype, index) => (
                  <Chip
                    key={index}
                    label={subtype}
                    onDelete={() => handleRemoveSubtype(index)}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Subtype Input */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Subtype Name"
              value={subtypeName}
              onChange={(e) => setSubtypeName(e.target.value)}
              placeholder="e.g., Cabernet Sauvignon, Single Malt"
              size="small"
              fullWidth
            />
            <IconButton
              color="primary"
              onClick={handleAddSubtype}
              disabled={!canAddSubtype}
              sx={{
                mt: 0.5,
                minWidth: 48,
                minHeight: 48,
                bgcolor: canAddSubtype ? 'primary.light' : 'grey.200',
                color: canAddSubtype ? 'white' : 'grey.500',
                '&:hover': { bgcolor: canAddSubtype ? 'primary.main' : 'grey.200' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>
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

export default NewAlcoholPage;

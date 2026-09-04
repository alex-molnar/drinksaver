import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  Fab,
  Zoom,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import { createBrand } from '../api/endpoints';

const NewBeerBrandPage: React.FC = () => {
  const { navigateToSuccess, navigateToError } = useAppNavigation();

  const [brandName, setBrandName] = useState('');
  const [flavourName, setFlavourName] = useState('');
  const [flavours, setFlavours] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddFlavour = () => {
    if (!flavourName.trim()) return;
    setFlavours([...flavours, flavourName.trim()]);
    setFlavourName('');
  };

  const handleRemoveFlavour = (index: number) => {
    setFlavours(flavours.filter((_, i) => i !== index));
  };

  const canAddFlavour = flavourName.trim().length > 0;

  const isFormValid = () => {
    return brandName.trim().length > 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    const saveOperation = async () => {
      await createBrand({
        name: brandName.trim(),
        flavours: flavours.length > 0 ? flavours : undefined,
      });
    };

    try {
      await saveOperation();
      navigateToSuccess(`Beer brand "${brandName}" has been created!`);
    } catch (error) {
      console.error('Failed to create brand:', error);
      navigateToError('Failed to create beer brand. Please try again.');
    }
  }, [brandName, flavours, navigateToSuccess, navigateToError]);

  return (
    <Layout title="New Beer Brand" showBackButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Brand Details */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <SportsBarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Brand Details
            </Typography>
          </Box>

          <TextField
            label="Brand Name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Heineken, Budweiser, Corona"
          />
        </Paper>

        {/* Flavours Section */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Flavours (optional)
          </Typography>

          {/* Added Flavours Display */}
          {flavours.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {flavours.map((flavour, index) => (
                  <Chip
                    key={index}
                    label={flavour}
                    onDelete={() => handleRemoveFlavour(index)}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Flavour Input */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Flavour/Taste Name"
              value={flavourName}
              onChange={(e) => setFlavourName(e.target.value)}
              placeholder="e.g., Original, Light, IPA"
              size="small"
              fullWidth
            />
            <IconButton
              color="primary"
              onClick={handleAddFlavour}
              disabled={!canAddFlavour}
              sx={{
                mt: 0.5,
                minWidth: 48,
                minHeight: 48,
                bgcolor: canAddFlavour ? 'primary.light' : 'grey.200',
                color: canAddFlavour ? 'white' : 'grey.500',
                '&:hover': { bgcolor: canAddFlavour ? 'primary.main' : 'grey.200' },
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

export default NewBeerBrandPage;

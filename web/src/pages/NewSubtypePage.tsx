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
import CategoryIcon from '@mui/icons-material/Category';
import Layout from '../components/Layout';
import { useAppNavigation } from '../hooks/useNavigation';
import { createSubtypeForAlcoholType } from '../api/endpoints';
import type { NewSubtypePageState } from '../types/api';

const NewSubtypePage: React.FC = () => {
  const location = useLocation();
  const { navigateToSuccess, navigateToError, navigateToHome } = useAppNavigation();
  const state = location.state as NewSubtypePageState | null;

  // Form state
  const [subtypeName, setSubtypeName] = useState('');
  const [saving, setSaving] = useState(false);

  // Redirect if no state provided
  if (!state) {
    return (
      <Layout title="New Subtype" showBackButton hideBottomNav>
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

  const isFormValid = () => {
    return subtypeName.trim().length > 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    try {
      await createSubtypeForAlcoholType(alcoholTypeId, subtypeName.trim());
      navigateToSuccess(`Subtype "${subtypeName}" has been created for ${alcoholTypeName}!`);
    } catch (error) {
      console.error('Failed to create subtype:', error);
      navigateToError('Failed to create subtype. Please try again.');
    }
  }, [alcoholTypeId, alcoholTypeName, subtypeName, navigateToSuccess, navigateToError]);

  return (
    <Layout title="New Subtype" showBackButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Info Alert */}
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Adding a new subtype for <strong>{alcoholTypeName}</strong>
        </Alert>

        {/* Subtype Details */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CategoryIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Subtype Details
            </Typography>
          </Box>

          <TextField
            label="Subtype Name"
            value={subtypeName}
            onChange={(e) => setSubtypeName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Cabernet Sauvignon, Single Malt, Blanco"
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

export default NewSubtypePage;

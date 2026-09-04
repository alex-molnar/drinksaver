import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  type SelectChangeEvent,
  CircularProgress,
  Typography,
  Paper,
  Divider,
  Fab,
  Zoom,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import QuantitySelector from '../components/QuantitySelector';
import { useAppNavigation } from '../hooks/useNavigation';
import {
  getAlcoholTypes,
  getVolumesByAlcoholType,
  getSubtypesByAlcoholType,
  getConsumptionTypes,
  getBrands,
  getBeerFlavours,
  saveDrink,
} from '../api/endpoints';

// Beer type ID - typically ID 1, but we check by name as fallback
const BEER_TYPE_NAME = 'Beer';

const DetailedPage: React.FC = () => {
  const { navigateToSuccess, navigateToError, navigateToNewAlcohol, navigateToNewVolume, navigateToNewBrand, navigateToNewSubtype, navigateToNewBeerFlavour } =
    useAppNavigation();

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Form state
  const [alcoholTypeId, setAlcoholTypeId] = useState<number | ''>('');
  const [volumeId, setVolumeId] = useState<number | ''>('');
  const [subtypeId, setSubtypeId] = useState<number | ''>('');
  const [consumptionTypeId, setConsumptionTypeId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [beerFlavourId, setBeerFlavourId] = useState<number | ''>('');
  const [drinkDate, setDrinkDate] = useState(getTodayDate());
  const [comments, setComments] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [addToRecommendations, setAddToRecommendations] = useState(false);
  const [onlyTemporarily, setOnlyTemporarily] = useState(false);
  const [recommendationName, setRecommendationName] = useState('');

  // Fetch alcohol types
  const { data: alcoholTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['alcoholTypes'],
    queryFn: () => getAlcoholTypes(),
  });

  // Check if selected type is beer
  const selectedType = alcoholTypes?.find((t) => t.id === alcoholTypeId);
  const isBeer =
    selectedType?.name.toLowerCase() === BEER_TYPE_NAME.toLowerCase();

  // Fetch volumes when alcohol type is selected
  const { data: volumes, isLoading: loadingVolumes } = useQuery({
    queryKey: ['volumes', alcoholTypeId],
    queryFn: () => getVolumesByAlcoholType(alcoholTypeId as number),
    enabled: alcoholTypeId !== '',
  });

  // Fetch subtypes when non-beer alcohol type is selected
  const { data: subtypes, isLoading: loadingSubtypes } = useQuery({
    queryKey: ['subtypes', alcoholTypeId],
    queryFn: () => getSubtypesByAlcoholType(alcoholTypeId as number),
    enabled: alcoholTypeId !== '' && !isBeer,
  });

  // Fetch beer-specific data when beer is selected
  const { data: consumptionTypes, isLoading: loadingConsumption } = useQuery({
    queryKey: ['consumptionTypes'],
    queryFn: () => getConsumptionTypes(),
    enabled: isBeer,
  });

  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => getBrands(),
    enabled: isBeer,
  });

  // Fetch beer flavours when brand is selected
  const { data: beerFlavours, isLoading: loadingFlavours } = useQuery({
    queryKey: ['beerFlavours', brandId],
    queryFn: () => getBeerFlavours(brandId as number),
    enabled: isBeer && brandId !== '',
  });

  // Get selected brand for navigation
  const selectedBrand = brands?.find((b) => b.id === brandId);

  // Reset dependent fields when alcohol type changes
  useEffect(() => {
    setVolumeId('');
    setSubtypeId('');
    setConsumptionTypeId('');
    setBrandId('');
    setBeerFlavourId('');
  }, [alcoholTypeId]);

  // Reset beer flavour when brand changes
  useEffect(() => {
    setBeerFlavourId('');
  }, [brandId]);

  // Form validation
  const isFormValid = () => {
    if (alcoholTypeId === '' || volumeId === '') return false;
    if (isBeer && consumptionTypeId === '') return false;
    return true;
  };

  const handleAlcoholTypeChange = (event: SelectChangeEvent<number | ''>) => {
    setAlcoholTypeId(event.target.value as number | '');
  };

  const handleSave = useCallback(async () => {
    if (!isFormValid()) return;

    setSaving(true);

    const saveOperation = async () => {
      // Use selected date or default to today
      const dateToSend = drinkDate || getTodayDate();

      await saveDrink({
        alcoholTypeId: alcoholTypeId as number,
        alcoholSubtypeId: subtypeId !== '' ? (subtypeId as number) : undefined,
        alcoholVolumeId: volumeId as number,
        brandId: brandId !== '' ? (brandId as number) : undefined,
        beerFlavourId: beerFlavourId !== '' ? (beerFlavourId as number) : undefined,
        consumptionTypeId: consumptionTypeId !== '' ? (consumptionTypeId as number) : undefined,
        comments: comments || undefined,
        date: dateToSend,
        quantity: quantity > 1 ? quantity : undefined,
        addToRecommendations: addToRecommendations || undefined,
        onlyTemporarily: addToRecommendations && onlyTemporarily ? true : undefined,
        name: addToRecommendations && recommendationName ? recommendationName : undefined,
      });
    };

    try {
      await saveOperation();
      const message = quantity > 1 
        ? `${quantity} drinks have been saved!` 
        : 'Your drink has been saved!';
      navigateToSuccess(message);
    } catch (error) {
      console.error('Failed to save drink:', error);
      navigateToError('Failed to save your drink. Please try again.');
    }
  }, [
    alcoholTypeId,
    volumeId,
    subtypeId,
    brandId,
    beerFlavourId,
    consumptionTypeId,
    drinkDate,
    comments,
    quantity,
    isBeer,
    navigateToSuccess,
    navigateToError,
    addToRecommendations,
    onlyTemporarily,
    recommendationName,
  ]);

  if (loadingTypes) {
    return (
      <Layout title="Add Drink">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Add Drink">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
        {/* Section 1: Drink Type */}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <LocalBarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              What are you drinking?
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="alcohol-type-label">Alcohol Type</InputLabel>
              <Select
                labelId="alcohol-type-label"
                value={alcoholTypeId}
                label="Alcohol Type"
                onChange={handleAlcoholTypeChange}
              >
                {alcoholTypes?.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              color="primary"
              onClick={navigateToNewAlcohol}
              sx={{ mt: 0.5, minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
            >
              <AddIcon />
            </IconButton>
          </Box>

          {/* Volume - shows when type selected */}
          {alcoholTypeId !== '' && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="volume-label">Volume</InputLabel>
                <Select
                  labelId="volume-label"
                  value={volumeId}
                  label="Volume"
                  onChange={(e) => setVolumeId(e.target.value as number | '')}
                  disabled={loadingVolumes}
                >
                  {volumes?.map((vol) => (
                    <MenuItem key={vol.id} value={vol.id}>
                      {vol.name} ({vol.volume}L)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={() =>
                  navigateToNewVolume(alcoholTypeId as number, selectedType?.name || '')
                }
                sx={{ mt: 0.5, minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
              >
                <AddIcon />
              </IconButton>
            </Box>
          )}

          {/* Subtype - shows when non-beer type selected */}
          {alcoholTypeId !== '' && !isBeer && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="subtype-label">Subtype</InputLabel>
                <Select
                  labelId="subtype-label"
                  value={subtypeId}
                  label="Subtype"
                  onChange={(e) => setSubtypeId(e.target.value as number | '')}
                  disabled={loadingSubtypes}
                >
                  {subtypes?.map((subtype) => (
                    <MenuItem key={subtype.id} value={subtype.id}>
                      {subtype.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={() =>
                  navigateToNewSubtype(alcoholTypeId as number, selectedType?.name || '')
                }
                sx={{ mt: 0.5, minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
              >
                <AddIcon />
              </IconButton>
            </Box>
          )}
        </Paper>

        {/* Section 2: Beer Details (conditional) */}
        {isBeer && (
          <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <SportsBarIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Beer Details
              </Typography>
            </Box>

            {/* Consumption Type */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="consumption-type-label">Consumption Type</InputLabel>
              <Select
                labelId="consumption-type-label"
                value={consumptionTypeId}
                label="Consumption Type"
                onChange={(e) =>
                  setConsumptionTypeId(e.target.value as number | '')
                }
                disabled={loadingConsumption}
              >
                {consumptionTypes?.map((ct) => (
                  <MenuItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Brand Selector */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="brand-label">Brand</InputLabel>
                <Select
                  labelId="brand-label"
                  value={brandId}
                  label="Brand"
                  onChange={(e) => setBrandId(e.target.value as number | '')}
                  disabled={loadingBrands}
                >
                  {brands?.map((brand) => (
                    <MenuItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={navigateToNewBrand}
                sx={{ mt: 0.5, minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
              >
                <AddIcon />
              </IconButton>
            </Box>

            {/* Beer Flavour - shows when brand is selected */}
            {brandId !== '' && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="flavour-label">Flavour/Taste</InputLabel>
                  <Select
                    labelId="flavour-label"
                    value={beerFlavourId}
                    label="Flavour/Taste"
                    onChange={(e) => setBeerFlavourId(e.target.value as number | '')}
                    disabled={loadingFlavours}
                  >
                    {beerFlavours?.map((flavour) => (
                      <MenuItem key={flavour.id} value={flavour.id}>
                        {flavour.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={() =>
                    navigateToNewBeerFlavour(brandId as number, selectedBrand?.name || '')
                  }
                  sx={{ mt: 0.5, minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            )}
          </Paper>
        )}

        {/* Section 3: Additional Details */}
        {alcoholTypeId !== '' && (
          <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CalendarTodayIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Additional Details
              </Typography>
            </Box>

            {/* Quantity selector */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                How many?
              </Typography>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={9}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <TextField
              label="Date"
              type="date"
              value={drinkDate}
              onChange={(e) => setDrinkDate(e.target.value)}
              fullWidth
              helperText="When did you have this drink?"
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: getTodayDate() },
              }}
              sx={{ mb: 2 }}
            />

            {/* Add to Recommendations */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={addToRecommendations}
                  onChange={(e) => setAddToRecommendations(e.target.checked)}
                />
              }
              label="Add as a recommendation"
              sx={{ mb: 1 }}
            />

            {/* Conditional recommendation options */}
            {addToRecommendations && (
              <Box sx={{ pl: 4, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={onlyTemporarily}
                      onChange={(e) => setOnlyTemporarily(e.target.checked)}
                    />
                  }
                  label="Only temporarily"
                  sx={{ mb: 1, display: 'block' }}
                />
                <TextField
                  label="Name"
                  value={recommendationName}
                  onChange={(e) => setRecommendationName(e.target.value)}
                  fullWidth
                  placeholder="Optional name for the recommendation"
                  size="small"
                />
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <TextField
              label="Notes (optional)"
              multiline
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              fullWidth
              placeholder="Add any notes about this drink..."
            />
          </Paper>
        )}

        {/* Validation hint */}
        {alcoholTypeId !== '' && !isFormValid() && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', mt: 1 }}
          >
            Please fill in all required fields to save
          </Typography>
        )}
      </Box>

      {/* Floating Action Button */}
      <Zoom in={isFormValid()}>
        <Fab
          color="primary"
          onClick={handleSave}
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

export default DetailedPage;

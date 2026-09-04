import React, { useState, useCallback } from 'react';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import RecommendationButton from '../components/RecommendationButton';
import { useAppNavigation } from '../hooks/useNavigation';
import { useResponsiveTileCount } from '../hooks/useResponsiveTileCount';
import { getRecommendations, saveDrink } from '../api/endpoints';
import type { Recommendation } from '../types/api';

// Generate a unique key for a recommendation since id can be null
const getRecommendationKey = (rec: Recommendation): string => {
  return `${rec.id ?? 'null'}-${rec.alcoholTypeId}-${rec.alcoholVolumeId}-${rec.brandId ?? 'null'}`;
};

const IndexPage: React.FC = () => {
  const { navigateToSuccess, navigateToError, navigateToDetailed } = useAppNavigation();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { maxRecommendations, tileHeight } = useResponsiveTileCount();

  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
  });

  const handleSaveRecommendation = useCallback(
    async (recommendation: Recommendation) => {
      setSavingKey(getRecommendationKey(recommendation));

      const saveOperation = async () => {
        await saveDrink({
          alcoholTypeId: recommendation.alcoholTypeId,
          alcoholSubtypeId: recommendation.alcoholSubtypeId,
          alcoholVolumeId: recommendation.alcoholVolumeId,
          brandId: recommendation.brandId,
          beerFlavourId: recommendation.beerFlavourId,
          consumptionTypeId: recommendation.consumptionTypeId,
        });
      };

      try {
        await saveOperation();
        navigateToSuccess(`${recommendation.name} has been saved!`);
      } catch (error) {
        console.error('Failed to save drink:', error);
        navigateToError(
          `Failed to save ${recommendation.name}. Please try again.`
        );
      }
    },
    [navigateToSuccess, navigateToError, setSavingKey]
  );

  if (isLoading) {
    return (
      <Layout>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Typography color="error">Failed to load recommendations</Typography>
        </Box>
      </Layout>
    );
  }

  // Take recommendations based on available screen space
  const displayRecommendations = recommendations?.slice(0, maxRecommendations) || [];

  return (
    <Layout title="Quick Save">
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Recommendations Grid */}
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {displayRecommendations.map((rec) => (
            <Grid
              size={6}
              key={rec.id}
              sx={{ height: tileHeight }}
            >
              <RecommendationButton
                name={rec.name}
                alcoholTypeId={rec.alcoholTypeId}
                onClick={() => handleSaveRecommendation(rec)}
                loading={savingKey === getRecommendationKey(rec)}
                disabled={savingKey !== null && savingKey !== getRecommendationKey(rec)}
              />
            </Grid>
          ))}
          
          {/* Add Custom button - always last */}
          <Grid size={6} sx={{ height: tileHeight }}>
            <RecommendationButton
              name="Add Custom"
              onClick={navigateToDetailed}
              disabled={savingKey !== null}
              isAddButton
            />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default IndexPage;

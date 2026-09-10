import React, { useCallback, useState } from 'react';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import RecommendationButton from '../components/RecommendationButton';
import { useAppNavigation } from '../hooks/useNavigation';
import { useResponsiveTileCount } from '../hooks/useResponsiveTileCount';
import { useSaveQueue } from '../drink/useSaveQueue';
import { drinkingDay } from '../drink/day';
import { getRecommendations } from '../api/endpoints';
import type { Recommendation } from '../types/api';

// Generate a unique key for a recommendation since id can be null
const getRecommendationKey = (rec: Recommendation): string => {
  return `${rec.id ?? 'null'}-${rec.alcoholTypeId}-${rec.alcoholVolumeId}-${rec.brandId ?? 'null'}`;
};

const IndexPage: React.FC = () => {
  // Logging never navigates: a tap saves through the queue and raises the undo strip in place.
  // Only "Add Custom" still navigates, to the detailed form this PR leaves untouched.
  const { navigateToDetailed } = useAppNavigation();
  const { save, queue } = useSaveQueue();
  const { maxRecommendations, tileHeight } = useResponsiveTileCount();

  // The tile that raised a save, and the queue entry id it is waiting on. Never explicitly
  // cleared: `savingKey` below derives "is it still in flight" fresh from the queue on every
  // render instead, so a stale `pendingSave` left over from an earlier tap is harmless.
  const [pendingSave, setPendingSave] = useState<{ key: string; id: string } | null>(null);

  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    // Recommendations are server cached and only actually change every five saves
    // (`RecommendationCacheService.INVALIDATE_AFTER_SAVES`); SaveQueueProvider defers their
    // refetch until the queue is idle, and this staleTime keeps an unrelated remount from
    // refetching them again in the meantime for no reason.
    staleTime: 5 * 60 * 1000,
  });

  // Derived, not stored: the tile's own spinner tracks only "is a POST for this tile in flight
  // right now". The strip (not this page) carries the outcome once the entry resolves, whichever
  // way, which is why leaving `entry` is enough to stop counting it without needing an effect.
  const activeSave =
    pendingSave && queue.entries.find((e) => e.id === pendingSave.id)?.status === 'saving' ? pendingSave : null;
  const savingKey = activeSave?.key ?? null;

  const handleSaveRecommendation = useCallback(
    (recommendation: Recommendation) => {
      const id = save({
        label: recommendation.name,
        date: drinkingDay(new Date()),
        alcoholTypeId: recommendation.alcoholTypeId,
        payload: {
          alcoholTypeId: recommendation.alcoholTypeId,
          alcoholSubtypeId: recommendation.alcoholSubtypeId,
          alcoholVolumeId: recommendation.alcoholVolumeId,
          brandId: recommendation.brandId,
          beerFlavourId: recommendation.beerFlavourId,
          consumptionTypeId: recommendation.consumptionTypeId,
        },
      });
      setPendingSave({ key: getRecommendationKey(recommendation), id });
    },
    [save]
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

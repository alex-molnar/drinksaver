import React, { useCallback, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AppFrame from '../components/AppFrame';
import PlateGrid, { type PlateGridItem } from '../components/PlateGrid';
import { useAppNavigation } from '../hooks/useNavigation';
import { useSaveQueue } from '../drink/useSaveQueue';
import { drinkingDay } from '../drink/day';
import { getRecommendations } from '../api/endpoints';
import type { Recommendation } from '../types/api';

/**
 * Recommendation ids are null in the common case: `DrinkKey.toRecommendation` never sets one.
 * This composite key is the ONLY key used both for React's reconciliation (`PlateGrid`'s `key`
 * prop) and for matching save-queue state back to a tile. That used to be two separate things -
 * `IndexPage.tsx:118` keyed React's reconciliation on `rec.id` alone while the save state already
 * keyed on this composite - and because id is null in the common case, every tile shared the
 * React key `null`. Harmless while tiles were stateless; a wrong-plate "Saved" stamp the moment
 * they are not, which is exactly what `Plate` now renders. Using one value for both purposes
 * makes that drift impossible rather than merely fixed.
 */
const getRecommendationKey = (rec: Recommendation): string =>
  `${rec.id ?? 'null'}-${rec.alcoholTypeId}-${rec.alcoholVolumeId}-${rec.brandId ?? 'null'}`;

const CenteredMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      p: 2,
    }}
  >
    {children}
  </Box>
);

/**
 * The Quick Save screen: two columns of enamel plates in a painted-board frame. Logging never
 * navigates - a tap saves through the queue in place, `PlateGrid` shows the saving and saved
 * states, and the undo strip (mounted by `SaveQueueProvider`, above this page) carries the
 * outcome. Only "Something else" still navigates, to the detailed form this PR leaves untouched.
 */
const QuickSavePage: React.FC = () => {
  const { navigateToDetailed } = useAppNavigation();
  const { save, queue } = useSaveQueue();

  // The tile that raised a save, and the queue entry id it is waiting on. Never explicitly
  // cleared: `savingKey` and `doneKey` below derive "what is this entry doing right now" fresh
  // from the queue on every render, so a stale `pendingSave` left over from an earlier tap is
  // harmless, and the queue's own rule (only one entry is ever undoable at a time) means an
  // older save's stamp clears itself the moment a newer one supersedes it.
  const [pendingSave, setPendingSave] = useState<{ key: string; id: string } | null>(null);

  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    // Recommendations are server cached and only actually change every five saves
    // (`RecommendationCacheService.INVALIDATE_AFTER_SAVES`); `SaveQueueProvider` defers their
    // refetch until the queue is idle, and this staleTime keeps an unrelated remount from
    // refetching them again in the meantime for no reason.
    staleTime: 5 * 60 * 1000,
  });

  const pendingEntry = pendingSave ? queue.entries.find((e) => e.id === pendingSave.id) : undefined;
  const savingKey = pendingSave && pendingEntry?.status === 'saving' ? pendingSave.key : null;
  const doneKey =
    pendingSave && pendingEntry && (pendingEntry.status === 'saved' || pendingEntry.status === 'undoable')
      ? pendingSave.key
      : null;

  const handleSave = useCallback(
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
      <AppFrame>
        <CenteredMessage>
          <CircularProgress color="primary" />
        </CenteredMessage>
      </AppFrame>
    );
  }

  // A failed recommendations query still leaves "Something else" reachable: the manual path is
  // the fallback for the automatic one, so an empty item list plus the ever-present add plate is
  // the right degraded state rather than a dead end.
  const items: PlateGridItem[] = error
    ? []
    : (recommendations ?? []).map((rec) => ({
        key: getRecommendationKey(rec),
        name: rec.name,
        alcoholTypeId: rec.alcoholTypeId,
        onSave: () => handleSave(rec),
      }));

  return (
    <AppFrame>
      {error ? (
        <Typography role="alert" color="error" sx={{ textAlign: 'center', pt: 2, px: 2 }}>
          Couldn&apos;t load recommendations. Add a drink instead.
        </Typography>
      ) : null}
      <PlateGrid
        items={items}
        savingKey={savingKey}
        doneKey={doneKey}
        saveInFlight={savingKey !== null}
        onAddCustom={navigateToDetailed}
      />
    </AppFrame>
  );
};

export default QuickSavePage;

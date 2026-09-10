import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Card,
  CardActionArea,
  Checkbox,
  IconButton,
  CircularProgress,
  Typography,
  Fab,
  Zoom,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { getSavedDrinksByDate, deleteDrinksByIds } from '../api/endpoints';
import { drinkingDay } from '../drink/day';
import { drinkIdentity } from '../drink/identity';
import { Glass } from '../drink/glassware';
import type { EditableDrink } from '../types/api';

// The drinking day, not the calendar day, so History opens on the night you were just out.
const getTodayDate = () => drinkingDay(new Date());

const HistoryPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: drinks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drinks', selectedDate],
    queryFn: () => getSavedDrinksByDate(selectedDate),
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedIds(new Set()); // Clear selection when date changes
  };

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleDeleteSingle = useCallback(
    async (id: number) => {
      setIsDeleting(true);
      try {
        await deleteDrinksByIds([id]);
        // Remove from selection if it was selected
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        // Refetch the list
        await refetch();
        // Invalidate recommendations in case they were affected
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      } catch (error) {
        console.error('Failed to delete drink:', error);
      } finally {
        setIsDeleting(false);
      }
    },
    [refetch, queryClient]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      await deleteDrinksByIds(Array.from(selectedIds));
      setSelectedIds(new Set());
      await refetch();
      // Invalidate recommendations in case they were affected
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    } catch (error) {
      console.error('Failed to delete drinks:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, refetch, queryClient]);

  const renderContent = () => {
    if (isLoading) {
      return (
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
      );
    }

    if (error) {
      return (
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
          <Typography color="error">Failed to load drinks</Typography>
        </Box>
      );
    }

    if (!drinks || drinks.length === 0) {
      return (
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
          <Typography color="text.secondary">
            No drinks recorded for this date
          </Typography>
        </Box>
      );
    }

    return (
      <Stack spacing={1.5} sx={{ width: '100%' }}>
        {drinks.map((drink: EditableDrink) => {
          const identity = drinkIdentity(drink.name, drink.alcoholTypeId);
          return (
          <Card
            key={drink.id}
            elevation={1}
            sx={{
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                elevation: 3,
                transform: 'translateY(-1px)',
                boxShadow: 3,
              },
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <CardActionArea
                onClick={() => handleToggleSelect(drink.id)}
                disabled={isDeleting}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 1,
                  flex: 1,
                }}
              >
                <Checkbox
                  checked={selectedIds.has(drink.id)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ mr: 1 }}
                />
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', width: 28, height: 28 }}>
                  <Glass kind={identity.glass} chroma={identity.chroma} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  {drink.name}
                </Typography>
              </CardActionArea>
              <IconButton
                aria-label="delete"
                onClick={() => handleDeleteSingle(drink.id)}
                disabled={isDeleting}
                sx={{
                  mr: 1,
                  color: 'error.light',
                  '&:hover': {
                    color: 'error.main',
                    backgroundColor: 'error.light',
                    '& .MuiSvgIcon-root': {
                      color: 'error.contrastText',
                    },
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Card>
          );
        })}
      </Stack>
    );
  };

  return (
    <Layout title="History">
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Date Selector */}
        <TextField
          label="Date"
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: getTodayDate() },
          }}
          sx={{ mb: 2 }}
        />

        {/* Drinks List */}
        {renderContent()}

        {/* Bulk Delete FAB */}
        <Zoom in={selectedIds.size > 0}>
          <Fab
            color="error"
            aria-label="delete selected"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            sx={{
              position: 'fixed',
              bottom: 80, // Above bottom navigation
              right: 16,
            }}
          >
            {isDeleting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <DeleteIcon />
            )}
          </Fab>
        </Zoom>
      </Box>
    </Layout>
  );
};

export default HistoryPage;

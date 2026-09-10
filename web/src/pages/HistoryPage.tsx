import React, { useCallback, useState } from 'react';
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
import Layout from '../components/Layout';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useSaveQueue } from '../drink/useSaveQueue';
import { drinkingDay } from '../drink/day';
import { drinkIdentity } from '../drink/identity';
import { Glass } from '../drink/glassware';
import type { EditableDrink } from '../types/api';

// The drinking day, not the calendar day, so History opens on the night you were just out.
const getTodayDate = () => drinkingDay(new Date());

const HistoryPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { remove } = useSaveQueue();
  const drinksForDate = useDrinksForDate(selectedDate);

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

  /**
   * A deferred delete with undo, not the immediate one this used to be: see
   * `SaveQueueProvider.tsx`. The row disappears from this list at once regardless, because
   * `useDrinksForDate` already excludes whatever the queue is suppressing - there is no local
   * "isDeleting" state to track any more, and nothing here awaits the network call.
   */
  const handleDeleteSingle = useCallback(
    (drink: EditableDrink) => {
      remove({ label: drink.name, date: selectedDate, drinkIds: [drink.id] });
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(drink.id);
        return newSet;
      });
    },
    [remove, selectedDate]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }
    const drinkIds = Array.from(selectedIds);
    const label = `${drinkIds.length} ${drinkIds.length === 1 ? 'drink' : 'drinks'}`;
    remove({ label, date: selectedDate, drinkIds });
    setSelectedIds(new Set());
  }, [selectedIds, remove, selectedDate]);

  const renderContent = () => {
    if (drinksForDate.status === 'loading') {
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

    if (drinksForDate.status === 'error') {
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

    const { rows } = drinksForDate;

    if (rows.length === 0) {
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
        {rows.map((drink: EditableDrink) => {
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
                onClick={() => handleDeleteSingle(drink)}
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
            sx={{
              position: 'fixed',
              bottom: 80, // Above bottom navigation
              right: 16,
            }}
          >
            <DeleteIcon />
          </Fab>
        </Zoom>
      </Box>
    </Layout>
  );
};

export default HistoryPage;

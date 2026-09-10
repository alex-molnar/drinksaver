import React from 'react';
import { Card, CardActionArea, Typography, Box, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { drinkIdentity } from '../drink/identity';
import { Glass } from '../drink/glassware';

interface RecommendationButtonProps {
  name: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  isAddButton?: boolean;
  /**
   * No longer used to pick an icon: `drinkIdentity` resolves by name alone, because an alcohol
   * type id is too coarse to tell two brands of the same type apart (see `drink/identity.ts`).
   * Kept as an accepted prop so existing callers, such as `IndexPage.tsx`, which still passes a
   * recommendation's `alcoholTypeId`, do not need to change for this.
   */
  alcoholTypeId?: number;
}

const RecommendationButton: React.FC<RecommendationButtonProps> = ({
  name,
  onClick,
  loading = false,
  disabled = false,
  isAddButton = false,
}) => {
  const identity = drinkIdentity(name);

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 100,
        bgcolor: isAddButton ? 'grey.100' : 'background.paper',
        border: isAddButton ? '2px dashed' : 'none',
        borderColor: 'grey.300',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: disabled ? 'none' : 'translateY(-2px)',
          boxShadow: disabled ? undefined : 4,
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={disabled || loading}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          gap: 1,
        }}
      >
        {loading ? (
          <CircularProgress size={32} color="primary" />
        ) : (
          <Box
            sx={{
              color: isAddButton ? 'text.secondary' : 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
            }}
          >
            {isAddButton ? (
              <AddIcon sx={{ fontSize: 32 }} />
            ) : (
              <Glass kind={identity.glass} chroma={identity.chroma} />
            )}
          </Box>
        )}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            color: isAddButton ? 'text.secondary' : 'text.primary',
          }}
        >
          {loading ? 'Saving...' : name}
        </Typography>
      </CardActionArea>
    </Card>
  );
};

export default RecommendationButton;

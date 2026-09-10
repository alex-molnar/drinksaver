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
   * The second rung of `drinkIdentity`'s lookup. The name alone is enough for a recommendation
   * whose name is in the identity table, and the id is what resolves everything else to at least
   * the right silhouette. See `drink/identity.ts`.
   */
  alcoholTypeId?: number;
}

const RecommendationButton: React.FC<RecommendationButtonProps> = ({
  name,
  onClick,
  loading = false,
  disabled = false,
  isAddButton = false,
  alcoholTypeId,
}) => {
  const identity = drinkIdentity(name, alcoholTypeId);

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

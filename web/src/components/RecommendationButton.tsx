import React from 'react';
import { Card, CardActionArea, Typography, Box, CircularProgress } from '@mui/material';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import WineBarIcon from '@mui/icons-material/WineBar';
import LiquorIcon from '@mui/icons-material/Liquor';
import NightlifeIcon from '@mui/icons-material/Nightlife';
import AddIcon from '@mui/icons-material/Add';

/**
 * Icon mapping for alcohol type IDs.
 * 
 * Categories:
 * - Beer & similar (SportsBarIcon): beer, cider, seltzer
 * - Wine (WineBarIcon): wines, champagne, prosecco, port, sherry, mead, fröccs
 * - Spirits (LiquorIcon): vodka, whiskey, rum, gin, tequila, brandy, cognac, etc.
 * - Cocktails (NightlifeIcon): cocktail, long drink
 */
const ALCOHOL_TYPE_ICONS: Record<number, React.ReactElement> = {
  // Beer & similar
  4: <SportsBarIcon sx={{ fontSize: 32 }} />,      // beer
  21: <SportsBarIcon sx={{ fontSize: 32 }} />,     // cider
  24: <SportsBarIcon sx={{ fontSize: 32 }} />,     // seltzer
  
  // Wine & wine-based
  13: <WineBarIcon sx={{ fontSize: 32 }} />,       // champagne
  14: <WineBarIcon sx={{ fontSize: 32 }} />,       // prosecco
  19: <WineBarIcon sx={{ fontSize: 32 }} />,       // port
  20: <WineBarIcon sx={{ fontSize: 32 }} />,       // sherry
  22: <WineBarIcon sx={{ fontSize: 32 }} />,       // mead
  26: <WineBarIcon sx={{ fontSize: 32 }} />,       // fröccs
  27: <WineBarIcon sx={{ fontSize: 32 }} />,       // rosé fröccs
  30: <WineBarIcon sx={{ fontSize: 32 }} />,       // red wine
  31: <WineBarIcon sx={{ fontSize: 32 }} />,       // white wine
  32: <WineBarIcon sx={{ fontSize: 32 }} />,       // rose wine
  
  // Spirits
  6: <LiquorIcon sx={{ fontSize: 32 }} />,         // vodka
  7: <LiquorIcon sx={{ fontSize: 32 }} />,         // whiskey
  8: <LiquorIcon sx={{ fontSize: 32 }} />,         // rum
  9: <LiquorIcon sx={{ fontSize: 32 }} />,         // gin
  10: <LiquorIcon sx={{ fontSize: 32 }} />,        // tequila
  11: <LiquorIcon sx={{ fontSize: 32 }} />,        // brandy
  12: <LiquorIcon sx={{ fontSize: 32 }} />,        // cognac
  15: <LiquorIcon sx={{ fontSize: 32 }} />,        // absinthe
  16: <LiquorIcon sx={{ fontSize: 32 }} />,        // sake
  17: <LiquorIcon sx={{ fontSize: 32 }} />,        // soju
  18: <LiquorIcon sx={{ fontSize: 32 }} />,        // vermouth
  25: <LiquorIcon sx={{ fontSize: 32 }} />,        // shot
  28: <LiquorIcon sx={{ fontSize: 32 }} />,        // pálinka
  
  // Cocktails & mixed drinks
  23: <NightlifeIcon sx={{ fontSize: 32 }} />,     // cocktail
  29: <NightlifeIcon sx={{ fontSize: 32 }} />,     // long drink
};

interface RecommendationButtonProps {
  name: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  isAddButton?: boolean;
  alcoholTypeId?: number;
}

/**
 * Get icon for a drink based on alcohol type ID with name-based fallback.
 * Priority: 1) Add button icon, 2) Alcohol type ID mapping, 3) Name keywords, 4) Default
 */
const getDrinkIcon = (name: string, isAddButton: boolean, alcoholTypeId?: number) => {
  if (isAddButton) return <AddIcon sx={{ fontSize: 32 }} />;
  
  // First, try to match by alcohol type ID (most reliable)
  if (alcoholTypeId !== undefined && ALCOHOL_TYPE_ICONS[alcoholTypeId]) {
    return ALCOHOL_TYPE_ICONS[alcoholTypeId];
  }
  
  // Fallback: match by name keywords (expanded list)
  const lowerName = name.toLowerCase();
  
  // Beer & related
  if (
    lowerName.includes('beer') ||
    lowerName.includes('lager') ||
    lowerName.includes('ale') ||
    lowerName.includes('stout') ||
    lowerName.includes('pilsner') ||
    lowerName.includes('ipa') ||
    lowerName.includes('porter') ||
    lowerName.includes('wheat') ||
    lowerName.includes('hefeweizen') ||
    lowerName.includes('cider') ||
    lowerName.includes('seltzer')
  ) {
    return <SportsBarIcon sx={{ fontSize: 32 }} />;
  }
  
  // Wine & related
  if (
    lowerName.includes('wine') ||
    lowerName.includes('champagne') ||
    lowerName.includes('prosecco') ||
    lowerName.includes('cava') ||
    lowerName.includes('merlot') ||
    lowerName.includes('cabernet') ||
    lowerName.includes('chardonnay') ||
    lowerName.includes('pinot') ||
    lowerName.includes('riesling') ||
    lowerName.includes('sangria') ||
    lowerName.includes('rosé') ||
    lowerName.includes('rose') ||
    lowerName.includes('fröccs') ||
    lowerName.includes('froccs') ||
    lowerName.includes('mead') ||
    lowerName.includes('port') ||
    lowerName.includes('sherry')
  ) {
    return <WineBarIcon sx={{ fontSize: 32 }} />;
  }
  
  // Spirits/Liquor
  if (
    lowerName.includes('whiskey') ||
    lowerName.includes('whisky') ||
    lowerName.includes('vodka') ||
    lowerName.includes('gin') ||
    lowerName.includes('rum') ||
    lowerName.includes('tequila') ||
    lowerName.includes('brandy') ||
    lowerName.includes('cognac') ||
    lowerName.includes('bourbon') ||
    lowerName.includes('scotch') ||
    lowerName.includes('mezcal') ||
    lowerName.includes('schnapps') ||
    lowerName.includes('liqueur') ||
    lowerName.includes('absinthe') ||
    lowerName.includes('shot') ||
    lowerName.includes('pálinka') ||
    lowerName.includes('palinka') ||
    lowerName.includes('sake') ||
    lowerName.includes('soju') ||
    lowerName.includes('vermouth')
  ) {
    return <LiquorIcon sx={{ fontSize: 32 }} />;
  }
  
  // Cocktails & mixed drinks
  if (
    lowerName.includes('cocktail') ||
    lowerName.includes('martini') ||
    lowerName.includes('mojito') ||
    lowerName.includes('margarita') ||
    lowerName.includes('daiquiri') ||
    lowerName.includes('cosmopolitan') ||
    lowerName.includes('negroni') ||
    lowerName.includes('spritz') ||
    lowerName.includes('highball') ||
    lowerName.includes('sour') ||
    lowerName.includes('fizz') ||
    lowerName.includes('collins') ||
    lowerName.includes('mule') ||
    lowerName.includes('long drink')
  ) {
    return <NightlifeIcon sx={{ fontSize: 32 }} />;
  }
  
  // Default: cocktail glass icon
  return <LocalBarIcon sx={{ fontSize: 32 }} />;
};

const RecommendationButton: React.FC<RecommendationButtonProps> = ({
  name,
  onClick,
  loading = false,
  disabled = false,
  isAddButton = false,
  alcoholTypeId,
}) => {
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
            }}
          >
            {getDrinkIcon(name, isAddButton, alcoholTypeId)}
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

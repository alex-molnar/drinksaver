import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 9,
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {/* Minus button */}
      <IconButton
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        sx={{
          minWidth: 48,
          minHeight: 48,
          bgcolor: value <= min ? 'action.disabledBackground' : 'primary.light',
          color: value <= min ? 'action.disabled' : 'white',
          '&:hover': {
            bgcolor: value <= min ? 'action.disabledBackground' : 'primary.main',
          },
          '&.Mui-disabled': {
            bgcolor: 'action.disabledBackground',
            color: 'action.disabled',
          },
        }}
      >
        <RemoveIcon />
      </IconButton>

      {/* Number in circle */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {value}
        </Typography>
      </Box>

      {/* Plus button */}
      <IconButton
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        sx={{
          minWidth: 48,
          minHeight: 48,
          bgcolor: value >= max ? 'action.disabledBackground' : 'primary.light',
          color: value >= max ? 'action.disabled' : 'white',
          '&:hover': {
            bgcolor: value >= max ? 'action.disabledBackground' : 'primary.main',
          },
          '&.Mui-disabled': {
            bgcolor: 'action.disabledBackground',
            color: 'action.disabled',
          },
        }}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
};

export default QuantitySelector;

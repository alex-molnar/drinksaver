import { useState, useEffect } from 'react';

/**
 * Layout constants (in pixels)
 * These match the Layout component structure
 */
const LAYOUT_OVERHEAD = {
  APP_BAR: 64,
  CONTAINER_PADDING_TOP: 16,
  BOTTOM_PADDING: 80, // pb: 10 = 80px to account for bottom nav
};

const TOTAL_OVERHEAD = Object.values(LAYOUT_OVERHEAD).reduce((a, b) => a + b, 0);

const GRID = {
  MIN_ROW_HEIGHT: 100, // Minimum height for a tile to be usable
  TARGET_ROW_HEIGHT: 130, // Ideal tile height for calculating row count
  SPACING: 16, // spacing={2} = 16px
  COLUMNS: 2,
};

export interface ResponsiveTileConfig {
  maxRecommendations: number;
  tileHeight: number;
}

/**
 * Calculate the tile configuration that fits exactly on screen
 * without requiring scrolling, reserving space for the "Add Custom" button.
 */
function calculateTileConfig(viewportHeight: number): ResponsiveTileConfig {
  const availableHeight = viewportHeight - TOTAL_OVERHEAD;
  
  // Calculate how many rows fit with target tile height
  const rowsThatFit = Math.max(
    Math.floor((availableHeight + GRID.SPACING) / (GRID.TARGET_ROW_HEIGHT + GRID.SPACING)),
    2 // At least 2 rows
  );
  
  // Calculate exact tile height to fill the space perfectly
  // availableHeight = (rowsThatFit * tileHeight) + ((rowsThatFit - 1) * spacing)
  // tileHeight = (availableHeight - (rowsThatFit - 1) * spacing) / rowsThatFit
  const tileHeight = Math.floor((availableHeight - (rowsThatFit - 1) * GRID.SPACING) / rowsThatFit);
  
  // Only enforce minimum height
  const finalTileHeight = Math.max(GRID.MIN_ROW_HEIGHT, tileHeight);
  
  // Total tiles = rows * columns, minus 1 for "Add Custom" button
  const totalTiles = rowsThatFit * GRID.COLUMNS;
  const maxRecommendations = Math.max(totalTiles - 1, 1); // At least 1 recommendation
  
  return {
    maxRecommendations,
    tileHeight: finalTileHeight,
  };
}

/**
 * Hook that returns the tile configuration for responsive display,
 * ensuring tiles fit exactly on screen without scrolling.
 */
export function useResponsiveTileCount(): ResponsiveTileConfig {
  const [config, setConfig] = useState<ResponsiveTileConfig>(() => {
    if (typeof window !== 'undefined') {
      return calculateTileConfig(window.innerHeight);
    }
    return { maxRecommendations: 7, tileHeight: 120 }; // Default fallback
  });

  useEffect(() => {
    const handleResize = () => {
      setConfig(calculateTileConfig(window.innerHeight));
    };

    // Initial calculation
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return config;
}

export default useResponsiveTileCount;

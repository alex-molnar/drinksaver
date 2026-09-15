import React, { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getColorPalettes, getGlassware } from '../api/endpoints';
import type { ColorPalette, Glassware } from '../types/api';
import { DesignContext } from './DesignContext';
import { createDesignCatalogue } from './designCatalogue';

const EMPTY_PALETTES: ColorPalette[] = [];
const EMPTY_GLASSWARE: Glassware[] = [];

/** A data-only provider used by tests and other callers that already own the endpoint results. */
export const DesignDataProvider: React.FC<{
  palettes: readonly ColorPalette[];
  glassware: readonly Glassware[];
  children: ReactNode;
}> = ({ palettes, glassware, children }) => {
  const catalogue = useMemo(() => createDesignCatalogue(palettes, glassware), [palettes, glassware]);
  return <DesignContext.Provider value={catalogue}>{children}</DesignContext.Provider>;
};

/**
 * Starts both independent design requests in the same render. The last successful values stay
 * visible during background refreshes; consumers need no loading branch because the local
 * fallbacks are safe while the first requests are in flight.
 */
export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const palettes = useQuery({
    queryKey: ['design', 'color-palettes'],
    queryFn: getColorPalettes,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const glassware = useQuery({
    queryKey: ['design', 'glassware'],
    queryFn: getGlassware,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return (
    <DesignDataProvider
      palettes={palettes.data ?? EMPTY_PALETTES}
      glassware={glassware.data ?? EMPTY_GLASSWARE}
    >
      {children}
    </DesignDataProvider>
  );
};

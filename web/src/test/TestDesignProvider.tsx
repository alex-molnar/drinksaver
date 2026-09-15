import React, { type ReactNode } from 'react';
import { DesignDataProvider } from '../drink/DesignProvider';
import { TEST_GLASSWARE, TEST_PALETTES } from './designFixtures';

export const TestDesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DesignDataProvider palettes={TEST_PALETTES} glassware={TEST_GLASSWARE}>
    {children}
  </DesignDataProvider>
);

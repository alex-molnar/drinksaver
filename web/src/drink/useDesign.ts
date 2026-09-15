import { useContext } from 'react';
import { DesignContext } from './DesignContext';
import type { DesignCatalogue } from './designCatalogue';

export const useDesign = (): DesignCatalogue => useContext(DesignContext);

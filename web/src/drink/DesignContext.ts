import { createContext } from 'react';
import { FALLBACK_DESIGN_CATALOGUE, type DesignCatalogue } from './designCatalogue';

export const DesignContext = createContext<DesignCatalogue>(FALLBACK_DESIGN_CATALOGUE);

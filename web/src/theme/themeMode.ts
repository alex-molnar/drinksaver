import { createContext, useContext } from 'react';
import { applyCssVars } from './cssVars';
import { darkTokens, lightTokens } from './tokens';

export type ThemeMode = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'drinksaver-theme';

export const readStoredThemeMode = (): ThemeMode => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyThemeMode = (root: HTMLElement, mode: ThemeMode): void => {
  const tokens = mode === 'light' ? lightTokens : darkTokens;
  applyCssVars(root, tokens);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.ownerDocument.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.surface.ground);
};

export interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({ mode: 'dark', toggleTheme: () => undefined });
export const useThemeMode = (): ThemeModeContextValue => useContext(ThemeModeContext);

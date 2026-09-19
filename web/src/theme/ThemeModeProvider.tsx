import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { lightMuiTheme, muiTheme } from './muiTheme';
import { applyThemeMode, readStoredThemeMode, THEME_STORAGE_KEY, ThemeModeContext, type ThemeMode, type ThemeModeContextValue } from './themeMode';

interface AppThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

export const AppThemeProvider = ({ children, initialMode = readStoredThemeMode() }: AppThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useLayoutEffect(() => applyThemeMode(document.documentElement, mode), [mode]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    toggleTheme: () => {
      setMode((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Theme switching remains available when storage is blocked.
        }
        return next;
      });
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={mode === 'light' ? lightMuiTheme : muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

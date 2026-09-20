import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppThemeProvider } from './ThemeModeProvider';
import { applyThemeMode, readStoredThemeMode, useThemeMode } from './themeMode';
import { lightTokens } from './tokens';

const Probe = () => {
  const { mode, toggleTheme } = useThemeMode();
  return <button type="button" onClick={toggleTheme}>{mode}</button>;
};

describe('theme mode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('defaults to dark and ignores an invalid stored value', () => {
    localStorage.setItem('drinksaver-theme', 'neon');
    expect(readStoredThemeMode()).toBe('dark');
  });

  it('restores a stored light preference', () => {
    localStorage.setItem('drinksaver-theme', 'light');
    expect(readStoredThemeMode()).toBe('light');
  });

  it('defaults safely when storage reads are blocked', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readStoredThemeMode()).toBe('dark');
    read.mockRestore();
  });

  it('applies the mode, CSS variables and browser chrome before render', () => {
    applyThemeMode(document.documentElement, 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--ds-surface-ground')).toBe(lightTokens.surface.ground);
  });

  it('toggles and persists the explicit choice', async () => {
    render(<AppThemeProvider initialMode="dark"><Probe /></AppThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
    expect(localStorage.getItem('drinksaver-theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
    expect(localStorage.getItem('drinksaver-theme')).toBe('dark');
  });

  it('uses the stored mode when no initial override is supplied', () => {
    localStorage.setItem('drinksaver-theme', 'light');
    render(<AppThemeProvider><Probe /></AppThemeProvider>);
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
  });

  it('still changes theme if storage is unavailable', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<AppThemeProvider initialMode="dark"><Probe /></AppThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
    write.mockRestore();
  });
});

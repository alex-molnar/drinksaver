import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdminPage } from './test/renderAdminPage';
import App from './App';

vi.mock('./api/admin', async (importOriginal) => ({
  ...await importOriginal<typeof import('./api/admin')>(),
  getDefaultTypes: vi.fn().mockResolvedValue([{ id: 4, name: 'Wine', colorPaletteId: 1, glasswareId: 1 }]),
  getDefaultSubtypes: vi.fn().mockResolvedValue([]),
  getDefaultBrands: vi.fn().mockResolvedValue([]),
  getDefaultFlavours: vi.fn().mockResolvedValue([]),
  getPalettes: vi.fn().mockResolvedValue([{ id: 1, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]),
  getGlassware: vi.fn().mockResolvedValue([{ id: 1, name: 'Tumbler', g: '', l: '', f: null }]),
}));

describe('admin routes and Workspace navigation', () => {
  it('renders the selected page and marks its navigation link current', async () => {
    renderAdminPage(<App />, '/alcohol-types');
    expect(await screen.findByRole('heading', { name: 'Alcohol types' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alcohol types' })).toHaveAttribute('aria-current', 'page');
  });

  it('supports direct child routes and unknown paths', async () => {
    const { unmount } = renderAdminPage(<App />, '/alcohol-types/4/subtypes');
    expect(await screen.findByRole('heading', { name: 'Subtypes for Wine' })).toBeInTheDocument();
    unmount();
    renderAdminPage(<App />, '/missing');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

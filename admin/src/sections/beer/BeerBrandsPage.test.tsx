import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeerBrandsPage } from './BeerBrandsPage';
import { renderAdminPage } from '../../test/renderAdminPage';

const api = vi.hoisted(() => ({ getDefaultBrands: vi.fn(), getUserBrands: vi.fn(), getPalettes: vi.fn(), createDefaultBrand: vi.fn(), updateBrand: vi.fn(), deleteBrand: vi.fn() }));
vi.mock('../../api/admin', () => api);

describe('BeerBrandsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDefaultBrands.mockResolvedValue([{ id: 8, name: 'North Star', colorPaletteId: 4 }]);
    api.getUserBrands.mockResolvedValue([{ id: 80, name: 'User brand', colorPaletteId: 4 }]);
    api.getPalettes.mockResolvedValue([{ id: 4, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]);
    api.createDefaultBrand.mockResolvedValue({ id: 11, name: 'Local', colorPaletteId: 4 });
    api.updateBrand.mockResolvedValue({});
    api.deleteBrand.mockResolvedValue(undefined);
  });

  it('shows default brands only and offers their flavour subpage', async () => {
    renderAdminPage(<BeerBrandsPage />, '/beer-brands');
    expect(await screen.findByRole('heading', { name: 'North Star' })).toBeInTheDocument();
    expect(screen.queryByText('User brand')).not.toBeInTheDocument();
    expect(api.getUserBrands).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /view flavours/i })).toHaveAttribute('href', '/beer-brands/8/flavours');
  });

  it('creates a brand with only nonblank initial flavour names', async () => {
    const user = userEvent.setup();
    renderAdminPage(<BeerBrandsPage />, '/beer-brands');
    await user.click(await screen.findByRole('button', { name: /new beer brand/i }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Local');
    await user.click(screen.getByRole('combobox', { name: 'Palette' }));
    await user.click(await screen.findByRole('option', { name: 'Amber' }));
    await user.click(screen.getByRole('button', { name: /add initial flavour/i }));
    await user.type(screen.getByRole('textbox', { name: 'Initial flavour 1' }), 'Citrus');
    await user.click(screen.getByRole('button', { name: /add initial flavour/i }));
    await user.click(screen.getByRole('button', { name: 'Create brand' }));
    expect(api.createDefaultBrand).toHaveBeenCalledWith({ name: 'Local', colorPaletteId: 4, flavours: ['Citrus'] });
  });
});

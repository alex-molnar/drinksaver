import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeerFlavoursPage } from './BeerFlavoursPage';
import { renderAdminPage } from '../../test/renderAdminPage';

const api = vi.hoisted(() => ({ getDefaultBrands: vi.fn(), getDefaultFlavours: vi.fn(), getPalettes: vi.fn(), createDefaultFlavour: vi.fn(), updateFlavour: vi.fn(), deleteFlavour: vi.fn() }));
vi.mock('../../api/admin', () => api);

describe('BeerFlavoursPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDefaultBrands.mockResolvedValue([{ id: 8, name: 'North Star', colorPaletteId: 4 }]);
    api.getDefaultFlavours.mockResolvedValue([{ id: 9, brandId: 8, name: 'Citrus', colorPaletteId: 4 }]);
    api.getPalettes.mockResolvedValue([{ id: 4, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]);
    api.createDefaultFlavour.mockResolvedValue({ id: 10, brandId: 8, name: 'Malt', colorPaletteId: 4 });
    api.updateFlavour.mockResolvedValue({});
    api.deleteFlavour.mockResolvedValue(undefined);
  });

  it('loads default flavours under their validated parent', async () => {
    renderAdminPage(<BeerFlavoursPage />, '/beer-brands/8/flavours', '/beer-brands/:brandId/flavours');
    expect(await screen.findByRole('heading', { name: 'Flavours for North Star' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Citrus' })).toBeInTheDocument();
    expect(api.getDefaultFlavours).toHaveBeenCalledWith(8);
  });

  it('shows the parent palette when a bundled flavour has a null override', async () => {
    api.getDefaultFlavours.mockResolvedValue([{ id: 9, brandId: 8, name: 'Citrus', colorPaletteId: null }]);
    api.getPalettes.mockResolvedValue([{ id: 4, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: '#123456' }]);
    renderAdminPage(<BeerFlavoursPage />, '/beer-brands/8/flavours', '/beer-brands/:brandId/flavours');
    expect(await screen.findByText(/Palette: Inherited from North Star \(Amber\)/)).toBeInTheDocument();
    expect(document.querySelector('.catalog-card .drink-preview-art')).toHaveStyle({ color: '#123456' });
  });

  it('does not fetch children for a missing default brand', async () => {
    api.getDefaultBrands.mockResolvedValue([]);
    renderAdminPage(<BeerFlavoursPage />, '/beer-brands/80/flavours', '/beer-brands/:brandId/flavours');
    expect(await screen.findByRole('heading', { name: 'Parent brand not found' })).toBeInTheDocument();
    expect(api.getDefaultFlavours).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /new flavour/i })).not.toBeInTheDocument();
  });

  it('creates a flavour for the route brand', async () => {
    const user = userEvent.setup();
    renderAdminPage(<BeerFlavoursPage />, '/beer-brands/8/flavours', '/beer-brands/:brandId/flavours');
    await user.click(await screen.findByRole('button', { name: /new flavour/i }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Malt');
    await user.click(screen.getByRole('combobox', { name: 'Palette' }));
    await user.click(await screen.findByRole('option', { name: 'Amber' }));
    await user.click(screen.getByRole('button', { name: 'Create flavour' }));
    expect(api.createDefaultFlavour).toHaveBeenCalledWith(8, { name: 'Malt', colorPaletteId: 4 });
  });
});

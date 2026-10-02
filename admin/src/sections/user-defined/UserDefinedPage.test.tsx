import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdminPage } from '../../test/renderAdminPage';
import { UserDefinedPage } from './UserDefinedPage';

const api = vi.hoisted(() => ({ getDefaultTypes: vi.fn(), getDefaultBrands: vi.fn(), getUserTypes: vi.fn(), getUserBrands: vi.fn(), getUserSubtypes: vi.fn(), getUserFlavours: vi.fn(), getPalettes: vi.fn(), getGlassware: vi.fn(), publishType: vi.fn(), publishSubtype: vi.fn(), publishBrand: vi.fn(), publishFlavour: vi.fn() }));
vi.mock('../../api/admin', () => api);

describe('UserDefinedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDefaultTypes.mockResolvedValue([{ id: 1, name: 'Wine', colorPaletteId: 2, glasswareId: 3 }]);
    api.getDefaultBrands.mockResolvedValue([{ id: 4, name: 'Brew', colorPaletteId: 2 }]);
    api.getUserTypes.mockResolvedValue([{ id: 10, name: 'Cider', userId: 'owner-1', colorPaletteId: 2, glasswareId: 3 }]);
    api.getUserBrands.mockResolvedValue([{ id: 11, name: 'Local beer', userId: 'owner-2', colorPaletteId: 2 }]);
    api.getUserSubtypes.mockResolvedValue([{ id: 12, name: 'Red', userId: 'owner-3', alcoholTypeId: 1, colorPaletteId: null, glasswareId: null }]);
    api.getUserFlavours.mockResolvedValue([{ id: 13, name: 'Cherry', userId: 'owner-4', brandId: 4, colorPaletteId: null }]);
    api.getPalettes.mockResolvedValue([{ id: 2, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]);
    api.getGlassware.mockResolvedValue([{ id: 3, name: 'Tumbler', g: '', l: '', f: null }]);
    api.publishType.mockResolvedValue({}); api.publishSubtype.mockResolvedValue({}); api.publishBrand.mockResolvedValue({}); api.publishFlavour.mockResolvedValue({});
  });

  it('shows user types with inspect and publish actions only', async () => {
    const user = userEvent.setup();
    renderAdminPage(<UserDefinedPage />, '/user-defined');
    expect(await screen.findByText('Owner: owner-1 · Palette: Amber · Glassware: Tumbler')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inspect Cider' }));
    expect(screen.getByRole('dialog', { name: 'Inspect Cider' })).toHaveTextContent('owner-1');
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('does not fetch children until a default parent is selected', async () => {
    const user = userEvent.setup();
    renderAdminPage(<UserDefinedPage />, '/user-defined?kind=subtypes');
    expect(await screen.findByText(/choose a default alcohol type/i)).toBeInTheDocument();
    expect(api.getUserSubtypes).not.toHaveBeenCalled();
    await user.click(screen.getByRole('combobox', { name: 'Default alcohol type' }));
    await user.click(await screen.findByRole('option', { name: 'Wine' }));
    expect((await screen.findAllByText('Red')).length).toBe(2);
    expect(api.getUserSubtypes).toHaveBeenCalledWith(1);
  });

  it('publishes with ownership and child confirmation then refreshes the source', async () => {
    const user = userEvent.setup();
    renderAdminPage(<UserDefinedPage />, '/user-defined');
    await user.click(await screen.findByRole('button', { name: 'Publish Cider' }));
    expect(screen.getByRole('dialog', { name: 'Publish Cider?' })).toHaveTextContent(/no undo/i);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.publishType).toHaveBeenCalledWith(10));
  });

  it('does not resolve a child parent from a user-defined collection', async () => {
    renderAdminPage(<UserDefinedPage />, '/user-defined?kind=flavours&parentId=999');
    expect(await screen.findByText(/choose a default beer brand/i)).toBeInTheDocument();
    expect(api.getUserFlavours).not.toHaveBeenCalled();
  });

  it('shows user brands and loads flavours only for their selected default brand', async () => {
    const { unmount } = renderAdminPage(<UserDefinedPage />, '/user-defined?kind=brands');
    expect((await screen.findAllByText('Local beer')).length).toBe(2);
    unmount();
    renderAdminPage(<UserDefinedPage />, '/user-defined?kind=flavours&parentId=4');
    expect((await screen.findAllByText('Cherry')).length).toBe(2);
    expect(api.getUserFlavours).toHaveBeenCalledWith(4);
    expect(api.getUserSubtypes).not.toHaveBeenCalled();
  });
});

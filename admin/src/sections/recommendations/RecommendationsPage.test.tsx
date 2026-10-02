import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdminPage } from '../../test/renderAdminPage';
import { RecommendationsPage } from './RecommendationsPage';

const api = vi.hoisted(() => ({ getRecommendations: vi.fn(), getDefaultTypes: vi.fn(), getDefaultBrands: vi.fn(), getDefaultSubtypes: vi.fn(), getDefaultFlavours: vi.fn(), getPalettes: vi.fn(), getGlassware: vi.fn(), getConsumptionTypes: vi.fn(), getVolumesByType: vi.fn(), createRecommendation: vi.fn(), updateRecommendations: vi.fn(), deleteRecommendation: vi.fn() }));
vi.mock('../../api/admin', () => api);
const row = (id: number, name: string) => ({ id, name, alcoholTypeId: 1, alcoholSubtypeId: null, alcoholVolumeId: null, brandId: null, beerFlavourId: null, consumptionTypeId: null, colorPaletteId: 1, glasswareId: 1, orderNumber: id });

describe('RecommendationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getRecommendations.mockResolvedValue([row(1, 'Beer'), row(2, 'Wine')]);
    api.getDefaultTypes.mockResolvedValue([{ id: 1, name: 'Alcohol', colorPaletteId: 1, glasswareId: 1 }]);
    api.getDefaultBrands.mockResolvedValue([]); api.getDefaultSubtypes.mockResolvedValue([]); api.getDefaultFlavours.mockResolvedValue([]);
    api.getPalettes.mockResolvedValue([{ id: 1, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]);
    api.getGlassware.mockResolvedValue([{ id: 1, name: 'Tumbler', g: '', l: '', f: null }]); api.getConsumptionTypes.mockResolvedValue([]);
    api.getVolumesByType.mockResolvedValue([]); api.createRecommendation.mockResolvedValue(row(3, 'New'));
    api.updateRecommendations.mockImplementation(async (updates: { id: number; name: string }[]) => updates.map((item, index) => ({ ...row(item.id, item.name), orderNumber: index })));
    api.deleteRecommendation.mockResolvedValue(undefined);
  });

  it('shows ordered summaries and name-only rename submits the complete order', async () => {
    const user = userEvent.setup();
    renderAdminPage(<RecommendationsPage />, '/recommendations');
    expect((await screen.findAllByText('Alcohol · Amber · Tumbler')).length).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Rename Wine' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name); await user.type(name, 'Red wine');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(api.updateRecommendations.mock.calls[0]?.[0]).toEqual([{ id: 1, name: 'Beer' }, { id: 2, name: 'Red wine' }]));
  });

  it('reorders with buttons and disables reorder when the list is filtered', async () => {
    const user = userEvent.setup();
    renderAdminPage(<RecommendationsPage />, '/recommendations');
    await screen.findAllByRole('button', { name: 'Move down' });
    await user.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    await waitFor(() => expect(api.updateRecommendations).toHaveBeenCalled());
    expect(api.updateRecommendations.mock.lastCall?.[0]).toEqual([{ id: 2, name: 'Wine' }, { id: 1, name: 'Beer' }]);
    await user.type(screen.getByRole('textbox', { name: 'Search recommendations' }), 'Beer');
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
  });

  it('supports keyboard sorting on the labelled drag handle', async () => {
    renderAdminPage(<RecommendationsPage />, '/recommendations');
    const handle = await screen.findByRole('button', { name: 'Drag Beer to reorder' });
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ', code: 'Space', keyCode: 32 });
    expect(handle).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates a new recommendation without adding optional fields by default', async () => {
    const user = userEvent.setup();
    renderAdminPage(<RecommendationsPage />, '/recommendations');
    await user.click(await screen.findByRole('button', { name: 'New recommendation' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Cider');
    for (const [label, option] of [['Alcohol type', 'Alcohol'], ['Palette', 'Amber'], ['Glassware', 'Tumbler']]) {
      await user.click(screen.getByRole('combobox', { name: label }));
      await user.click(await screen.findByRole('option', { name: option }));
    }
    await user.click(screen.getByRole('button', { name: 'Create recommendation' }));
    await waitFor(() => expect(api.createRecommendation).toHaveBeenCalledWith({ name: 'Cider', alcoholTypeId: 1, colorPaletteId: 1, glasswareId: 1 }));
  });

  it('keeps a failed rename draft open and reloads the current ordered list', async () => {
    const user = userEvent.setup();
    api.updateRecommendations.mockRejectedValueOnce(new Error('offline'));
    renderAdminPage(<RecommendationsPage />, '/recommendations');
    await user.click(await screen.findByRole('button', { name: 'Rename Wine' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Red wine' } });
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/changes are still here/i);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Red wine');
    expect(screen.getByRole('dialog', { name: 'Rename Wine' })).toBeInTheDocument();
  });
});

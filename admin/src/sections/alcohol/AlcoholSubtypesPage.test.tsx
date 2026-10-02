import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlcoholSubtypesPage } from './AlcoholSubtypesPage';
import { renderAdminPage } from '../../test/renderAdminPage';

const api = vi.hoisted(() => ({
  getDefaultTypes: vi.fn(), getDefaultSubtypes: vi.fn(), getPalettes: vi.fn(), getGlassware: vi.fn(),
  createDefaultSubtype: vi.fn(), updateSubtype: vi.fn(), deleteSubtype: vi.fn(),
}));
vi.mock('../../api/admin', () => api);

describe('AlcoholSubtypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDefaultTypes.mockResolvedValue([{ id: 3, name: 'Wine', colorPaletteId: 4, glasswareId: 5 }]);
    api.getDefaultSubtypes.mockResolvedValue([{ id: 7, alcoholTypeId: 3, name: 'Red', colorPaletteId: 4, glasswareId: 5 }]);
    api.getPalettes.mockResolvedValue([{ id: 4, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null }]);
    api.getGlassware.mockResolvedValue([{ id: 5, name: 'Tumbler', g: 'M1 1', l: 'M2 2', f: null }]);
    api.createDefaultSubtype.mockResolvedValue({ id: 8, alcoholTypeId: 3, name: 'Dry', colorPaletteId: 4, glasswareId: 5 });
    api.updateSubtype.mockResolvedValue({});
    api.deleteSubtype.mockResolvedValue(undefined);
  });

  it('loads a direct child route from its default parent and shows only default children', async () => {
    renderAdminPage(<AlcoholSubtypesPage />, '/alcohol-types/3/subtypes', '/alcohol-types/:typeId/subtypes');
    expect(await screen.findByRole('heading', { name: 'Subtypes for Wine' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Red' })).toBeInTheDocument();
    expect(api.getDefaultSubtypes).toHaveBeenCalledWith(3);
  });

  it('does not fetch or create children when the route parent is not a default type', async () => {
    api.getDefaultTypes.mockResolvedValue([]);
    renderAdminPage(<AlcoholSubtypesPage />, '/alcohol-types/999/subtypes', '/alcohol-types/:typeId/subtypes');
    expect(await screen.findByRole('heading', { name: 'Parent type not found' })).toBeInTheDocument();
    expect(api.getDefaultSubtypes).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /new subtype/i })).not.toBeInTheDocument();
  });

  it('rejects a non-integer parent path before querying child rows', async () => {
    renderAdminPage(<AlcoholSubtypesPage />, '/alcohol-types/3.0/subtypes', '/alcohol-types/:typeId/subtypes');
    expect(await screen.findByRole('heading', { name: 'Parent type not found' })).toBeInTheDocument();
    expect(api.getDefaultSubtypes).not.toHaveBeenCalled();
  });

  it('creates a subtype using the parent in the route', async () => {
    const user = userEvent.setup();
    renderAdminPage(<AlcoholSubtypesPage />, '/alcohol-types/3/subtypes', '/alcohol-types/:typeId/subtypes');
    await user.click(await screen.findByRole('button', { name: /new subtype/i }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Dry');
    await user.click(screen.getByRole('combobox', { name: 'Palette' }));
    await user.click(await screen.findByRole('option', { name: 'Amber' }));
    await user.click(screen.getByRole('combobox', { name: 'Glassware' }));
    await user.click(await screen.findByRole('option', { name: 'Tumbler' }));
    await user.click(screen.getByRole('button', { name: 'Create subtype' }));
    expect(api.createDefaultSubtype).toHaveBeenCalledWith(3, { name: 'Dry', colorPaletteId: 4, glasswareId: 5 });
  });

  it('disables duplicate submission and keeps the draft after a server error', async () => {
    const user = userEvent.setup();
    let rejectRequest!: (error: unknown) => void;
    api.createDefaultSubtype.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    renderAdminPage(<AlcoholSubtypesPage />, '/alcohol-types/3/subtypes', '/alcohol-types/:typeId/subtypes');
    await user.click(await screen.findByRole('button', { name: /new subtype/i }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.type(name, 'Dry');
    await user.click(screen.getByRole('combobox', { name: 'Palette' }));
    await user.click(await screen.findByRole('option', { name: 'Amber' }));
    await user.click(screen.getByRole('combobox', { name: 'Glassware' }));
    await user.click(await screen.findByRole('option', { name: 'Tumbler' }));
    await user.click(screen.getByRole('button', { name: 'Create subtype' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await act(async () => rejectRequest(Object.assign(new Error('failure'), { isAxiosError: true, response: { status: 500 } })));
    expect(await screen.findByRole('alert')).toHaveTextContent(/your changes are still here/i);
    expect(name).toHaveValue('Dry');
    expect(screen.getByRole('dialog', { name: 'Create subtype' })).toBeInTheDocument();
  });
});

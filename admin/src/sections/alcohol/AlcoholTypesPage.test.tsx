import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { AlcoholTypesPage } from './AlcoholTypesPage';
import { renderAdminPage } from '../../test/renderAdminPage';

const api = vi.hoisted(() => ({
  getDefaultTypes: vi.fn(), getPalettes: vi.fn(), getGlassware: vi.fn(), getRecommendations: vi.fn(),
  getDefaultSubtypes: vi.fn(), createDefaultType: vi.fn(), updateType: vi.fn(), deleteType: vi.fn(),
  createDefaultSubtype: vi.fn(), updateSubtype: vi.fn(), deleteSubtype: vi.fn(),
}));
vi.mock('../../api/admin', () => api);

const palette = { id: 4, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null };
const glassware = { id: 5, name: 'Tumbler', g: 'M1 1', l: 'M2 2', f: null };
const defaultType = { id: 3, name: 'Wine', userId: 'default-owner', volumeIds: [9], colorPaletteId: 4, glasswareId: 5 };

describe('AlcoholTypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDefaultTypes.mockResolvedValue([defaultType]);
    api.getPalettes.mockResolvedValue([palette]);
    api.getGlassware.mockResolvedValue([glassware]);
    api.getRecommendations.mockResolvedValue([]);
    api.getDefaultSubtypes.mockResolvedValue([]);
    api.createDefaultType.mockResolvedValue({ ...defaultType, id: 21 });
    api.updateType.mockResolvedValue(defaultType);
    api.deleteType.mockResolvedValue(undefined);
    api.createDefaultSubtype.mockResolvedValue({ id: 22, alcoholTypeId: 21, name: 'Dry', colorPaletteId: null, glasswareId: null });
    api.updateSubtype.mockResolvedValue({});
    api.deleteSubtype.mockResolvedValue(undefined);
  });

  it('shows default rows and offers child navigation', async () => {
    renderAdminPage(<AlcoholTypesPage />, '/alcohol-types');
    expect(await screen.findByRole('heading', { name: 'Wine' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view subtypes/i })).toHaveAttribute('href', '/alcohol-types/3/subtypes');
  });

  it('distinguishes filtered-empty results from an empty catalogue', async () => {
    const user = userEvent.setup();
    renderAdminPage(<AlcoholTypesPage />, '/alcohol-types');
    await user.type(await screen.findByRole('textbox', { name: 'Search alcohol types' }), 'not present');
    expect(screen.getByText(/no entries match your search/i)).toBeInTheDocument();
  });

  it('creates only supported fields and shows bundled child names on the child route', async () => {
    const user = userEvent.setup();
    let storedTypes = [defaultType];
    api.getDefaultTypes.mockImplementation(async () => storedTypes);
    api.getDefaultSubtypes.mockImplementation(async (id: number) => id === 21 ? [{ id: 22, alcoholTypeId: 21, name: 'Dry', colorPaletteId: null, glasswareId: null }] : []);
    api.createDefaultType.mockImplementation(async () => {
      const created = { ...defaultType, id: 21, name: 'Cider' };
      storedTypes = [...storedTypes, created];
      return created;
    });
    renderAdminPage(<App />, '/alcohol-types');
    await user.click(await screen.findByRole('button', { name: /new alcohol type/i }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Cider');
    await user.click(screen.getByRole('combobox', { name: 'Palette' }));
    await user.click(await screen.findByRole('option', { name: 'Amber' }));
    await user.click(screen.getByRole('combobox', { name: 'Glassware' }));
    await user.click(await screen.findByRole('option', { name: 'Tumbler' }));
    await user.click(screen.getByRole('button', { name: /add initial subtype/i }));
    await user.type(screen.getByRole('textbox', { name: 'Initial subtype 1' }), 'Dry');
    await user.click(screen.getByRole('button', { name: /add initial subtype/i }));
    await user.click(screen.getByRole('button', { name: 'Create type' }));

    expect(api.createDefaultType).toHaveBeenCalledWith({ name: 'Cider', colorPaletteId: 4, glasswareId: 5, alcoholSubtypes: ['Dry'] });
    expect(api.createDefaultType.mock.calls[0][0]).not.toHaveProperty('volumeIds');
    expect(api.createDefaultType.mock.calls[0][0]).not.toHaveProperty('userId');
    await user.click(await screen.findByRole('link', { name: 'View subtypes for Cider' }));
    expect(await screen.findByRole('heading', { name: 'Subtypes for Cider' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dry' })).toBeInTheDocument();
    expect(api.getDefaultSubtypes).toHaveBeenCalledWith(21);
    expect(api.createDefaultSubtype).not.toHaveBeenCalled();
  });

  it('edits a nullable design assignment without sending null as a reset', async () => {
    const user = userEvent.setup();
    api.getDefaultTypes.mockResolvedValue([{ ...defaultType, colorPaletteId: null }]);
    renderAdminPage(<AlcoholTypesPage />, '/alcohol-types');
    await user.click(await screen.findByRole('button', { name: 'Edit Wine' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Wine updated');
    await user.click(screen.getByRole('button', { name: 'Save type' }));
    expect(api.updateType).toHaveBeenCalledWith(3, { name: 'Wine updated' });
  });

  it('keeps a delete dialog and the row when the database reports a conflict', async () => {
    const user = userEvent.setup();
    api.deleteType.mockRejectedValueOnce(Object.assign(new Error('conflict'), { isAxiosError: true, response: { status: 409 } }));
    renderAdminPage(<AlcoholTypesPage />, '/alcohol-types');
    await user.click(await screen.findByRole('button', { name: 'Delete Wine' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/still in use/i);
    expect(screen.getByRole('dialog', { name: 'Delete Wine?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('heading', { name: 'Wine' })).toBeInTheDocument();
  });
});

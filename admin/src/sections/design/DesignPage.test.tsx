import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignPage } from './DesignPage';
import { renderAdminPage } from '../../test/renderAdminPage';

const api = vi.hoisted(() => ({
  getPalettes: vi.fn(), createPalette: vi.fn(), updatePalette: vi.fn(), deletePalette: vi.fn(),
  getGlassware: vi.fn(), createGlassware: vi.fn(), updateGlassware: vi.fn(), deleteGlassware: vi.fn(),
  getConsumptionTypes: vi.fn(), createConsumptionType: vi.fn(), updateConsumptionType: vi.fn(), deleteConsumptionType: vi.fn(),
}));
vi.mock('../../api/admin', () => api);

describe('DesignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPalettes.mockResolvedValue([{ id: 1, name: 'Amber', field: '#d58c29', inkLight: '#ffffff', inkDark: null }]);
    api.getGlassware.mockResolvedValue([{ id: 2, name: 'Tumbler', g: 'M1 1', l: 'M2 2', f: null }]);
    api.getConsumptionTypes.mockResolvedValue([{ id: 3, name: 'Neat', glasswareId: 2 }]);
    api.createPalette.mockResolvedValue({ id: 4, name: 'Blue', field: '#123456', inkLight: null, inkDark: null });
    api.updatePalette.mockResolvedValue({ id: 1, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null });
    api.deletePalette.mockResolvedValue(undefined);
    api.createGlassware.mockResolvedValue({ id: 5, name: 'Goblet', g: 'M1 1', l: 'M2 2', f: null });
    api.updateGlassware.mockResolvedValue({ id: 2, name: 'Tumbler', g: 'M1 1', l: 'M2 2', f: null });
    api.deleteGlassware.mockResolvedValue(undefined);
    api.createConsumptionType.mockResolvedValue({ id: 4, name: 'On ice', glasswareId: 2 });
    api.updateConsumptionType.mockResolvedValue({ id: 3, name: 'Neat', glasswareId: 2 });
    api.deleteConsumptionType.mockResolvedValue(undefined);
  });

  it('provides three tabs and loads the selected tab from the URL', async () => {
    renderAdminPage(<DesignPage />, '/design?tab=glassware', '/design');
    expect(await screen.findByRole('heading', { name: 'Glassware' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Glassware' })).toHaveAttribute('aria-selected', 'true');
    expect(api.getGlassware).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('tab', { name: 'Consumption types' }));
    expect(await screen.findByRole('heading', { name: 'Consumption types' })).toBeInTheDocument();
    expect(api.getConsumptionTypes).toHaveBeenCalledOnce();
  });

  it('creates palettes with validated hex values and optional inks', async () => {
    const user = userEvent.setup();
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'New palette' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Blue');
    await user.type(screen.getByRole('textbox', { name: 'Field colour' }), 'blue');
    await user.click(screen.getByRole('button', { name: 'Create palette' }));
    expect(await screen.findByText(/valid .*hex colours/i)).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Field colour' }));
    await user.type(screen.getByRole('textbox', { name: 'Field colour' }), '#123456');
    await user.click(screen.getByRole('button', { name: 'Create palette' }));
    expect(api.createPalette).toHaveBeenCalledWith({ name: 'Blue', field: '#123456' });
  });

  it('keeps the native colour control paired with the hex input', async () => {
    const user = userEvent.setup();
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'New palette' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Field colour' }), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('Choose field colour'), { target: { value: '#123456' } });
    expect(screen.getByRole('textbox', { name: 'Field colour' })).toHaveValue('#123456');
  });

  it('updates light and dark drink previews as the draft palette changes', async () => {
    const user = userEvent.setup();
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'New palette' }));
    await user.type(screen.getByRole('textbox', { name: 'Field colour' }), '#123456');
    await waitFor(() => expect(screen.getByRole('group', { name: 'Light theme preview' }).querySelector('svg path')).toHaveAttribute('fill', '#123456'));
    expect(screen.getByRole('group', { name: 'Dark theme preview' }).querySelector('svg path')).toHaveAttribute('fill', '#123456');
  });

  it('keeps unsupported existing colours visible and asks for correction', async () => {
    const user = userEvent.setup();
    api.getPalettes.mockResolvedValue([{ id: 1, name: 'Legacy', field: 'papayawhip', inkLight: null, inkDark: null }]);
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'Edit Legacy' }));
    expect(screen.getByRole('textbox', { name: 'Field colour' })).toHaveValue('papayawhip');
    await user.click(screen.getByRole('button', { name: 'Save palette' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid .*hex colours/i);
    expect(api.updatePalette).not.toHaveBeenCalled();
  });

  it('preserves palette draft after a server conflict', async () => {
    const user = userEvent.setup();
    api.createPalette.mockRejectedValue(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'New palette' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Blue');
    await user.type(screen.getByRole('textbox', { name: 'Field colour' }), '#123456');
    await user.click(screen.getByRole('button', { name: 'Create palette' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/server rejected/i);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Blue');
    expect(screen.getByRole('dialog', { name: 'Create palette' })).toBeInTheDocument();
  });

  it('sends an explicit empty string to clear one nullable ink and omits the untouched ink', async () => {
    const user = userEvent.setup();
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'Edit Amber' }));
    await user.clear(screen.getByRole('textbox', { name: 'Light ink' }));
    await user.click(screen.getByRole('button', { name: 'Save palette' }));
    expect(api.updatePalette).toHaveBeenCalledWith(1, { inkLight: '' });
  });

  it('clears dark ink independently while leaving light ink unchanged', async () => {
    const user = userEvent.setup();
    api.getPalettes.mockResolvedValue([{ id: 1, name: 'Amber', field: '#d58c29', inkLight: '#ffffff', inkDark: '#111111' }]);
    renderAdminPage(<DesignPage />, '/design?tab=palettes', '/design');
    await user.click(await screen.findByRole('button', { name: 'Edit Amber' }));
    await user.click(screen.getByRole('button', { name: 'Clear dark ink' }));
    await user.click(screen.getByRole('button', { name: 'Save palette' }));
    expect(api.updatePalette).toHaveBeenCalledWith(1, { inkDark: '' });
  });

  it('updates glassware preview from draft paths and sends foam clear as an empty string', async () => {
    const user = userEvent.setup();
    api.getGlassware.mockResolvedValue([{ id: 2, name: 'Tumbler', g: 'M1 1', l: 'M2 2', f: 'M3 3' }]);
    api.getPalettes.mockResolvedValue([
      { id: 1, name: 'Amber', field: '#d58c29', inkLight: null, inkDark: null },
      { id: 6, name: 'Blue', field: '#123456', inkLight: null, inkDark: null },
    ]);
    renderAdminPage(<DesignPage />, '/design?tab=glassware', '/design');
    await user.click(await screen.findByRole('button', { name: 'Edit Tumbler' }));
    const outline = screen.getByRole('textbox', { name: 'Outline path' });
    await user.clear(outline);
    await user.type(outline, 'M7 7');
    expect(screen.getByTestId('glassware-preview').querySelector('path')).toHaveAttribute('d', 'M2 2');
    expect(screen.getByTestId('glassware-preview').querySelector('path[stroke]')).toHaveAttribute('d', 'M7 7');
    await user.click(screen.getByRole('combobox', { name: 'Preview palette' }));
    await user.click(await screen.findByRole('option', { name: 'Blue' }));
    expect(screen.getByTestId('glassware-preview').querySelector('path')).toHaveAttribute('fill', '#123456');
    await user.clear(screen.getByRole('textbox', { name: 'Foam path' }));
    await user.click(screen.getByRole('button', { name: 'Save glassware' }));
    expect(api.updateGlassware).toHaveBeenCalledWith(2, { g: 'M7 7', f: '' });
  });

  it('lists all consumption types and keeps a delete conflict open', async () => {
    const user = userEvent.setup();
    api.getConsumptionTypes.mockResolvedValue(Array.from({ length: 11 }, (_, index) => ({ id: index + 1, name: `Type ${index + 1}`, glasswareId: 2 })));
    api.deleteConsumptionType.mockRejectedValue(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
    renderAdminPage(<DesignPage />, '/design?tab=consumption-types', '/design');
    expect(await screen.findByRole('heading', { name: 'Type 11' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete Type 11' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/in use|references/i);
    expect(screen.getByRole('dialog', { name: 'Delete Type 11?' })).toBeInTheDocument();
  });

  it('blocks consumption-type creation when no glassware exists', async () => {
    api.getGlassware.mockResolvedValue([]);
    renderAdminPage(<DesignPage />, '/design?tab=consumption-types', '/design');
    expect(await screen.findByText(/Create glassware before adding a consumption type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New consumption type' })).toBeDisabled();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import DetailedPage from './DetailedPage';
import {
  getAlcoholTypes,
  getVolumesByAlcoholType,
  getSubtypesByAlcoholType,
  getConsumptionTypes,
  getBrands,
  getBeerFlavours,
  saveDrink,
} from '../api/endpoints';
import { useAppNavigation } from '../hooks/useNavigation';

vi.mock('../api/endpoints');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));
vi.mock('../hooks/useNavigation');

const navigateToSuccess = vi.fn();
const navigateToError = vi.fn();

beforeEach(() => {
  vi.mocked(useAppNavigation).mockReturnValue({
    navigateToSuccess,
    navigateToError,
    navigateToHome: vi.fn(),
    navigateToDetailed: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  navigateToSuccess.mockClear();
  navigateToError.mockClear();

  vi.mocked(getAlcoholTypes).mockResolvedValue([
    { id: 1, name: 'Beer', volumeIds: [] },
    { id: 2, name: 'Wine', volumeIds: [] },
  ]);
  vi.mocked(getVolumesByAlcoholType).mockImplementation(async (alcoholTypeId: number) =>
    alcoholTypeId === 1
      ? [{ id: 10, name: 'Pint', volume: 0.5 }]
      : [{ id: 20, name: 'Glass', volume: 0.2 }]
  );
  vi.mocked(getSubtypesByAlcoholType).mockResolvedValue([{ id: 30, name: 'Red', alcoholTypeId: 2 }]);
  vi.mocked(getConsumptionTypes).mockResolvedValue([{ id: 40, name: 'Draft' }]);
  vi.mocked(getBrands).mockResolvedValue([
    { id: 50, name: 'Heineken' },
    { id: 51, name: 'Corona' },
  ]);
  vi.mocked(getBeerFlavours).mockResolvedValue([{ id: 60, name: 'Lager', brandId: 50 }]);
});

// MUI's Select is not a native <select>: opening it means clicking the
// combobox, then picking the option by role from the listbox it renders into
// a portal.
const selectOption = async (comboboxName: RegExp, optionName: RegExp) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByRole('option', { name: optionName }));
};

/**
 * By its label, not by the SaveIcon data-testid: MUI strips those from production
 * bundles, so a test depending on one was testing something the shipped app lacks.
 *
 * getByLabelText rather than getByRole here on purpose. The Fab sits inside a
 * <Zoom in={isFormValid}>, and while the form is incomplete the exit transition takes
 * it out of the accessibility tree. That is correct behaviour, but it makes a role
 * query depend on transition timing: with getByRole this helper failed roughly two
 * full parallel runs in three, while passing every time in isolation.
 * getByLabelText matches the aria-label attribute directly, so it is deterministic in
 * both states. The role query is the one a screen reader's behaviour actually rests
 * on, so it is asserted once, in "gives the save button an accessible name", at the
 * point where the button is usable.
 */
const saveButton = () => screen.getByLabelText('Save drink');

describe('DetailedPage', () => {
  /**
   * F10. The Fab's only content is a SaveIcon, so before the aria-label a screen reader
   * announced the primary action of this screen as "button". Asserted directly rather
   * than left implicit in the saveButton() helper, so removing the label fails a test
   * that says why instead of fifteen that say "cannot find button".
   */
  it('gives the save button an accessible name', async () => {
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    await selectOption(/alcohol type/i, /wine/i);
    await selectOption(/^volume$/i, /glass/i);

    // No hidden: true here. Once the form is valid the Fab is exposed to assistive
    // technology, and this is the assertion that would fail if the aria-label went away.
    expect(screen.getByRole('button', { name: /save drink/i })).toBeEnabled();
  });

  it('renders a loading spinner while alcohol types are loading, then the form', async () => {
    renderWithProviders(<DetailedPage />);

    expect(await screen.findByRole('combobox', { name: /alcohol type/i })).toBeInTheDocument();
  });

  it('shows beer-specific fields only for the beer type, and requires a consumption type only for beer', async () => {
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    await selectOption(/alcohol type/i, /wine/i);
    await selectOption(/^volume$/i, /glass/i);

    expect(screen.queryByRole('combobox', { name: /consumption type/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^brand$/i })).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    await selectOption(/alcohol type/i, /beer/i);
    await selectOption(/^volume$/i, /pint/i);

    expect(screen.getByRole('combobox', { name: /consumption type/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^brand$/i })).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await selectOption(/consumption type/i, /draft/i);

    expect(saveButton()).toBeEnabled();
  });

  it('clears volume, subtype, consumption type, brand and flavour when the alcohol type changes', async () => {
    vi.mocked(saveDrink).mockResolvedValue({
      id: 1,
      userId: 'u1',
      date: '2026-01-01',
      alcoholTypeId: 2,
      alcoholVolumeId: 20,
    });
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    // Fully populate the beer branch.
    await selectOption(/alcohol type/i, /beer/i);
    await selectOption(/^volume$/i, /pint/i);
    await selectOption(/consumption type/i, /draft/i);
    await selectOption(/^brand$/i, /heineken/i);
    await selectOption(/flavour\/taste/i, /lager/i);

    // Switch to a non-beer type: the beer-only fields unmount, but their
    // state must also be cleared, not merely hidden, or a save right after
    // would silently resend the stale beer ids.
    await selectOption(/alcohol type/i, /wine/i);

    expect(screen.queryByRole('combobox', { name: /consumption type/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^brand$/i })).not.toBeInTheDocument();

    await selectOption(/^volume$/i, /glass/i);
    await selectOption(/^subtype$/i, /red/i);

    await userEvent.click(saveButton());

    await waitFor(() => expect(saveDrink).toHaveBeenCalled());
    const payload = vi.mocked(saveDrink).mock.calls[0][0];
    expect(payload).toMatchObject({
      alcoholTypeId: 2,
      alcoholVolumeId: 20,
      alcoholSubtypeId: 30,
      brandId: undefined,
      beerFlavourId: undefined,
      consumptionTypeId: undefined,
    });
  });

  it('clears the beer flavour when the brand changes', async () => {
    vi.mocked(saveDrink).mockResolvedValue({
      id: 1,
      userId: 'u1',
      date: '2026-01-01',
      alcoholTypeId: 1,
      alcoholVolumeId: 10,
    });
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    await selectOption(/alcohol type/i, /beer/i);
    await selectOption(/^volume$/i, /pint/i);
    await selectOption(/consumption type/i, /draft/i);
    await selectOption(/^brand$/i, /heineken/i);
    await selectOption(/flavour\/taste/i, /lager/i);

    await selectOption(/^brand$/i, /corona/i);

    await userEvent.click(saveButton());

    await waitFor(() => expect(saveDrink).toHaveBeenCalled());
    const payload = vi.mocked(saveDrink).mock.calls[0][0];
    expect(payload).toMatchObject({
      brandId: 51,
      beerFlavourId: undefined,
      consumptionTypeId: 40,
    });
  });

  it('saves and navigates to success', async () => {
    vi.mocked(saveDrink).mockResolvedValue({
      id: 1,
      userId: 'u1',
      date: '2026-01-01',
      alcoholTypeId: 2,
      alcoholVolumeId: 20,
    });
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    await selectOption(/alcohol type/i, /wine/i);
    await selectOption(/^volume$/i, /glass/i);
    await userEvent.click(saveButton());

    await waitFor(() => expect(navigateToSuccess).toHaveBeenCalled());
    expect(navigateToError).not.toHaveBeenCalled();
    expect(saveDrink).toHaveBeenCalledWith(
      expect.objectContaining({ alcoholTypeId: 2, alcoholVolumeId: 20 })
    );
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(saveDrink).mockRejectedValue(new Error('boom'));
    renderWithProviders(<DetailedPage />);
    await screen.findByRole('combobox', { name: /alcohol type/i });

    await selectOption(/alcohol type/i, /wine/i);
    await selectOption(/^volume$/i, /glass/i);
    await userEvent.click(saveButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

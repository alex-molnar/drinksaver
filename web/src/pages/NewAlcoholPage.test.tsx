import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import NewAlcoholPage from './NewAlcoholPage';
import { createAlcoholType } from '../api/endpoints';
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
});

const nameField = () => screen.getByLabelText(/alcohol type name/i);
const volumeNameField = () => screen.getByLabelText('Name');
const volumeLitersField = () => screen.getByLabelText('Liters');
const subtypeNameField = () => screen.getByLabelText(/subtype name/i);
const submitButton = () => screen.getByTestId('SaveIcon').closest('button') as HTMLButtonElement;

describe('NewAlcoholPage', () => {
  it('disables submit while the form is invalid and enables it once valid', async () => {
    renderWithProviders(<NewAlcoholPage />);

    expect(submitButton()).toBeDisabled();

    await userEvent.type(nameField(), 'Whiskey');

    expect(submitButton()).toBeEnabled();
  });

  // The page renders two "Add" icon buttons (volumes, subtypes) in that
  // order, and Chip's onDelete only fires from a click on the delete
  // (Cancel) icon itself, not the chip body, so both must be targeted
  // precisely rather than by an ambient role query.
  const addVolumeButton = () => screen.getAllByTestId('AddIcon')[0].closest('button') as HTMLButtonElement;
  const addSubtypeButton = () => screen.getAllByTestId('AddIcon')[1].closest('button') as HTMLButtonElement;

  it('adds and removes a volume entry', async () => {
    renderWithProviders(<NewAlcoholPage />);

    await userEvent.type(volumeNameField(), 'Shot');
    await userEvent.type(volumeLitersField(), '0.05');
    await userEvent.click(addVolumeButton());

    expect(screen.getByText('Shot (0.05L)')).toBeInTheDocument();
    // The inputs are cleared after adding.
    expect(volumeNameField()).toHaveValue('');

    await userEvent.click(screen.getByTestId('CancelIcon'));

    expect(screen.queryByText('Shot (0.05L)')).not.toBeInTheDocument();
  });

  it('adds and removes a subtype entry', async () => {
    renderWithProviders(<NewAlcoholPage />);

    await userEvent.type(subtypeNameField(), 'Single Malt');
    await userEvent.click(addSubtypeButton());

    expect(screen.getByText('Single Malt')).toBeInTheDocument();
    expect(subtypeNameField()).toHaveValue('');

    await userEvent.click(screen.getByTestId('CancelIcon'));

    expect(screen.queryByText('Single Malt')).not.toBeInTheDocument();
  });

  it('submits the trimmed name with any added volumes and subtypes, and navigates to success', async () => {
    vi.mocked(createAlcoholType).mockResolvedValue({ id: 1, name: 'Whiskey', volumeIds: [] });
    renderWithProviders(<NewAlcoholPage />);

    await userEvent.type(nameField(), '  Whiskey  ');
    await userEvent.click(submitButton());

    expect(createAlcoholType).toHaveBeenCalledWith({
      name: 'Whiskey',
      volumes: undefined,
      alcoholSubtypes: undefined,
    });
    expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('Whiskey'));
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(createAlcoholType).mockRejectedValue(new Error('boom'));
    renderWithProviders(<NewAlcoholPage />);

    await userEvent.type(nameField(), 'Whiskey');
    await userEvent.click(submitButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

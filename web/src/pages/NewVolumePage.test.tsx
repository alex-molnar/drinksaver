import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import NewVolumePage from './NewVolumePage';
import { createVolumeForAlcoholType } from '../api/endpoints';
import { useAppNavigation } from '../hooks/useNavigation';

vi.mock('../api/endpoints');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));
vi.mock('../hooks/useNavigation');

const navigateToSuccess = vi.fn();
const navigateToError = vi.fn();
const navigateToHome = vi.fn();

beforeEach(() => {
  vi.mocked(useAppNavigation).mockReturnValue({
    navigateToSuccess,
    navigateToError,
    navigateToHome,
    navigateToDetailed: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  navigateToSuccess.mockClear();
  navigateToError.mockClear();
  navigateToHome.mockClear();
});

const validState = { alcoholTypeId: 4, alcoholTypeName: 'Wine' };

const nameField = () => screen.getByLabelText(/volume name/i);
const litersField = () => screen.getByLabelText(/volume in liters/i);
const submitButton = () => screen.getByTestId('SaveIcon').closest('button') as HTMLButtonElement;

describe('NewVolumePage', () => {
  it('shows an error card and no form when navigated to without state', () => {
    renderWithProviders(<NewVolumePage />);

    expect(screen.getByText(/missing alcohol type information/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/volume name/i)).not.toBeInTheDocument();
  });

  it('navigates home from the error card', async () => {
    renderWithProviders(<NewVolumePage />);

    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));

    expect(navigateToHome).toHaveBeenCalled();
  });

  it('renders the form and the contextual alcohol type name when state is present', () => {
    renderWithProviders(<NewVolumePage />, { state: validState });

    expect(nameField()).toBeInTheDocument();
    expect(screen.getByText(/wine/i)).toBeInTheDocument();
  });

  it('disables submit while the form is invalid and enables it once valid', async () => {
    renderWithProviders(<NewVolumePage />, { state: validState });

    expect(submitButton()).toBeDisabled();

    await userEvent.type(nameField(), 'Glass');
    await userEvent.type(litersField(), '0.5');

    expect(submitButton()).toBeEnabled();
  });

  it('accepts a volume within (0, 2) and rejects one at or above 2', async () => {
    renderWithProviders(<NewVolumePage />, { state: validState });

    await userEvent.type(nameField(), 'Glass');
    await userEvent.type(litersField(), '2');

    expect(screen.getByText(/volume must be less than 2 liters/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    await userEvent.clear(litersField());
    await userEvent.type(litersField(), '0.5');

    expect(screen.queryByText(/volume must be less than 2 liters/i)).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('submits the trimmed name and parsed volume, and navigates to success on a successful save', async () => {
    vi.mocked(createVolumeForAlcoholType).mockResolvedValue({ id: 1, name: 'Glass', volume: 0.5 });
    renderWithProviders(<NewVolumePage />, { state: validState });

    await userEvent.type(nameField(), '  Glass  ');
    await userEvent.type(litersField(), '0.5');
    await userEvent.click(submitButton());

    expect(createVolumeForAlcoholType).toHaveBeenCalledWith(4, { name: 'Glass', volume: 0.5 });
    expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('Glass'));
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(createVolumeForAlcoholType).mockRejectedValue(new Error('boom'));
    renderWithProviders(<NewVolumePage />, { state: validState });

    await userEvent.type(nameField(), 'Glass');
    await userEvent.type(litersField(), '0.5');
    await userEvent.click(submitButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

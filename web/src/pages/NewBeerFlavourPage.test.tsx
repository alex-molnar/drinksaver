import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import NewBeerFlavourPage from './NewBeerFlavourPage';
import { createBeerFlavour } from '../api/endpoints';
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

const validState = { brandId: 3, brandName: 'Heineken' };

const nameField = () => screen.getByLabelText(/flavour\/taste name/i);
const submitButton = () => screen.getByTestId('SaveIcon').closest('button') as HTMLButtonElement;

describe('NewBeerFlavourPage', () => {
  it('shows an error card and no form when navigated to without state', () => {
    renderWithProviders(<NewBeerFlavourPage />);

    expect(screen.getByText(/missing beer brand information/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/flavour\/taste name/i)).not.toBeInTheDocument();
  });

  it('navigates home from the error card', async () => {
    renderWithProviders(<NewBeerFlavourPage />);

    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));

    expect(navigateToHome).toHaveBeenCalled();
  });

  it('renders the form and the contextual brand name when state is present', () => {
    renderWithProviders(<NewBeerFlavourPage />, { state: validState });

    expect(nameField()).toBeInTheDocument();
    expect(screen.getByText(/heineken/i)).toBeInTheDocument();
  });

  it('disables submit while the form is invalid and enables it once valid', async () => {
    renderWithProviders(<NewBeerFlavourPage />, { state: validState });

    expect(submitButton()).toBeDisabled();

    await userEvent.type(nameField(), 'IPA');

    expect(submitButton()).toBeEnabled();
  });

  it('submits the trimmed name and navigates to success on a successful save', async () => {
    vi.mocked(createBeerFlavour).mockResolvedValue({ id: 1, brandId: 3, name: 'IPA' });
    renderWithProviders(<NewBeerFlavourPage />, { state: validState });

    await userEvent.type(nameField(), '  IPA  ');
    await userEvent.click(submitButton());

    expect(createBeerFlavour).toHaveBeenCalledWith(3, 'IPA');
    expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('IPA'));
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(createBeerFlavour).mockRejectedValue(new Error('boom'));
    renderWithProviders(<NewBeerFlavourPage />, { state: validState });

    await userEvent.type(nameField(), 'IPA');
    await userEvent.click(submitButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

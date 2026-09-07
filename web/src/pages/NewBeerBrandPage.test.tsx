import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import NewBeerBrandPage from './NewBeerBrandPage';
import { createBrand } from '../api/endpoints';
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

const nameField = () => screen.getByLabelText(/brand name/i);
const flavourNameField = () => screen.getByLabelText(/flavour\/taste name/i);
const addFlavourButton = () => screen.getByTestId('AddIcon').closest('button') as HTMLButtonElement;
const submitButton = () => screen.getByTestId('SaveIcon').closest('button') as HTMLButtonElement;

describe('NewBeerBrandPage', () => {
  it('disables submit while the form is invalid and enables it once valid', async () => {
    renderWithProviders(<NewBeerBrandPage />);

    expect(submitButton()).toBeDisabled();

    await userEvent.type(nameField(), 'Heineken');

    expect(submitButton()).toBeEnabled();
  });

  it('adds and removes a flavour entry', async () => {
    renderWithProviders(<NewBeerBrandPage />);

    await userEvent.type(flavourNameField(), 'IPA');
    await userEvent.click(addFlavourButton());

    expect(screen.getByText('IPA')).toBeInTheDocument();
    expect(flavourNameField()).toHaveValue('');

    await userEvent.click(screen.getByTestId('CancelIcon'));

    expect(screen.queryByText('IPA')).not.toBeInTheDocument();
  });

  it('submits the trimmed name with any added flavours, and navigates to success', async () => {
    vi.mocked(createBrand).mockResolvedValue({ id: 1, name: 'Heineken' });
    renderWithProviders(<NewBeerBrandPage />);

    await userEvent.type(nameField(), '  Heineken  ');
    await userEvent.click(submitButton());

    expect(createBrand).toHaveBeenCalledWith({ name: 'Heineken', flavours: undefined });
    expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('Heineken'));
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(createBrand).mockRejectedValue(new Error('boom'));
    renderWithProviders(<NewBeerBrandPage />);

    await userEvent.type(nameField(), 'Heineken');
    await userEvent.click(submitButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

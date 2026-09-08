import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import NewSubtypePage from './NewSubtypePage';
import { createSubtypeForAlcoholType } from '../api/endpoints';
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

const validState = { alcoholTypeId: 7, alcoholTypeName: 'Whiskey' };

const nameField = () => screen.getByLabelText(/subtype name/i);
const submitButton = () => screen.getByTestId('SaveIcon').closest('button') as HTMLButtonElement;

describe('NewSubtypePage', () => {
  it('shows an error card and no form when navigated to without state', () => {
    renderWithProviders(<NewSubtypePage />);

    expect(screen.getByText(/missing alcohol type information/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/subtype name/i)).not.toBeInTheDocument();
  });

  it('navigates home from the error card', async () => {
    renderWithProviders(<NewSubtypePage />);

    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));

    expect(navigateToHome).toHaveBeenCalled();
  });

  it('renders the form and the contextual alcohol type name when state is present', () => {
    renderWithProviders(<NewSubtypePage />, { state: validState });

    expect(nameField()).toBeInTheDocument();
    expect(screen.getByText(/whiskey/i)).toBeInTheDocument();
  });

  it('disables submit while the form is invalid and enables it once valid', async () => {
    renderWithProviders(<NewSubtypePage />, { state: validState });

    expect(submitButton()).toBeDisabled();

    await userEvent.type(nameField(), 'Single Malt');

    expect(submitButton()).toBeEnabled();
  });

  it('submits the trimmed name and navigates to success on a successful save', async () => {
    vi.mocked(createSubtypeForAlcoholType).mockResolvedValue({ id: 1, alcoholTypeId: 7, name: 'Single Malt' });
    renderWithProviders(<NewSubtypePage />, { state: validState });

    await userEvent.type(nameField(), '  Single Malt  ');
    await userEvent.click(submitButton());

    expect(createSubtypeForAlcoholType).toHaveBeenCalledWith(7, 'Single Malt');
    expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('Single Malt'));
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('navigates to error and not to success when the save is rejected', async () => {
    vi.mocked(createSubtypeForAlcoholType).mockRejectedValue(new Error('boom'));
    renderWithProviders(<NewSubtypePage />, { state: validState });

    await userEvent.type(nameField(), 'Single Malt');
    await userEvent.click(submitButton());

    await waitFor(() => expect(navigateToError).toHaveBeenCalled());
    expect(navigateToSuccess).not.toHaveBeenCalled();
  });
});

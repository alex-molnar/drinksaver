import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import SuccessPage from './SuccessPage';
import { useAppNavigation } from '../hooks/useNavigation';

vi.mock('../hooks/useNavigation');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockUseNavigation = vi.mocked(useAppNavigation);
const navigateToHome = vi.fn();

beforeEach(() => {
  mockUseNavigation.mockReturnValue({
    navigateToSuccess: vi.fn(),
    navigateToError: vi.fn(),
    navigateToHome,
    navigateToDetailed: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  vi.clearAllMocks();
});

describe('SuccessPage', () => {
  it('renders the message passed through router state', () => {
    renderWithProviders(<SuccessPage />, {
      state: { message: 'Beer has been saved!' },
    });

    expect(screen.getByText(/beer has been saved/i)).toBeInTheDocument();
  });

  it('renders a fallback message when state is missing', () => {
    renderWithProviders(<SuccessPage />);

    expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
  });

  it('renders a success icon', () => {
    renderWithProviders(<SuccessPage />, {
      state: { message: 'Saved!' },
    });

    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
  });

  it('renders a "Cheers" heading', () => {
    renderWithProviders(<SuccessPage />, {
      state: { message: 'Saved!' },
    });

    expect(screen.getByText(/cheers/i)).toBeInTheDocument();
  });

  it('navigates to home when button is clicked', async () => {
    renderWithProviders(<SuccessPage />, {
      state: { message: 'Saved!' },
    });

    const button = screen.getByRole('button', { name: /back to home/i });
    await userEvent.click(button);

    expect(navigateToHome).toHaveBeenCalled();
  });

  it('hides the bottom navigation', () => {
    renderWithProviders(<SuccessPage />, {
      state: { message: 'Saved!' },
    });

    expect(screen.queryByRole('tab', { name: /quick save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /add drink/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /history/i })).not.toBeInTheDocument();
  });
});

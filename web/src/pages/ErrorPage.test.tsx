import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import ErrorPage from './ErrorPage';
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

describe('ErrorPage', () => {
  it('renders the message passed through router state', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed to save beer' },
    });

    expect(screen.getByText(/failed to save beer/i)).toBeInTheDocument();
  });

  it('renders a fallback message when state is missing', () => {
    renderWithProviders(<ErrorPage />);

    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
  });

  it('renders an error icon', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
  });

  it('renders an "Oops" heading', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    expect(screen.getByText(/oops/i)).toBeInTheDocument();
  });

  it('shows Try Again button', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows Back to Home button', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
  });

  it('navigates to home when Back to Home button is clicked', async () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    const button = screen.getByRole('button', { name: /back to home/i });
    await userEvent.click(button);

    expect(navigateToHome).toHaveBeenCalled();
  });

  it('calls window.history.back when Try Again button is clicked', async () => {
    const historyBackSpy = vi.spyOn(window.history, 'back');

    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    const button = screen.getByRole('button', { name: /try again/i });
    await userEvent.click(button);

    expect(historyBackSpy).toHaveBeenCalled();

    historyBackSpy.mockRestore();
  });

  it('hides the bottom navigation', () => {
    renderWithProviders(<ErrorPage />, {
      state: { message: 'Failed!' },
    });

    expect(screen.queryByRole('tab', { name: /quick save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /add drink/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /history/i })).not.toBeInTheDocument();
  });
});

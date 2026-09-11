import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import AppFrame from './AppFrame';
import { useDrinksForDate } from '../drink/useDrinksForDate';

vi.mock('../drink/useDrinksForDate');
const mockUseDrinksForDate = vi.mocked(useDrinksForDate);

const logout = vi.fn();
vi.mock('../auth', () => ({
  useAuth: () => ({ logout }),
}));

const RouteProbe = () => {
  const location = useLocation();
  return (
    <>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
    </>
  );
};

describe('AppFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDrinksForDate.mockReturnValue({ status: 'loading' });
  });

  it('renders the drinking-day heading', () => {
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    expect(screen.getByRole('heading', { name: /^(Today|Tonight)$/ })).toBeInTheDocument();
  });

  /**
   * The header follows the 06:00 rollover, so between midnight and six it has to say Tonight.
   * Saying Today there would claim a date the drinking day has not reached, and every other
   * surface (the strip, the day strip in PR 10) would disagree with it.
   */
  it.each([
    [new Date(2026, 8, 10, 0, 30), 'Tonight'],
    [new Date(2026, 8, 10, 5, 59), 'Tonight'],
    [new Date(2026, 8, 10, 6, 0), 'Today'],
    [new Date(2026, 8, 10, 22, 15), 'Today'],
  ])('says %s at that hour', (when, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(when);
    try {
      renderWithProviders(
        <AppFrame>
          <div />
        </AppFrame>
      );
      expect(screen.getByRole('heading', { name: expected })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders its children', () => {
    renderWithProviders(
      <AppFrame>
        <div>grid content</div>
      </AppFrame>
    );

    expect(screen.getByText('grid content')).toBeInTheDocument();
  });

  it('shows nothing for the count while the day has not loaded yet', () => {
    mockUseDrinksForDate.mockReturnValue({ status: 'loading' });
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    expect(screen.queryByText(/so far/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nothing yet/i)).not.toBeInTheDocument();
  });

  it('shows "Nothing yet" once the day has loaded with no drinks', () => {
    mockUseDrinksForDate.mockReturnValue({ status: 'ready', rows: [] });
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('shows the count once the day has loaded with drinks', () => {
    mockUseDrinksForDate.mockReturnValue({
      status: 'ready',
      rows: [
        { id: 1, name: 'Heineken pint', alcoholTypeId: 4 },
        { id: 2, name: 'Guinness pint', alcoholTypeId: 4 },
        { id: 3, name: 'Duvel bottle', alcoholTypeId: 4 },
      ],
    });
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    expect(screen.getByText('3 so far')).toBeInTheDocument();
  });

  it('signs out when the header icon button is tapped', async () => {
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  describe('bottom navigation', () => {
    it.each([
      ['Quick', '/'],
      ['History', '/history'],
    ])('navigates to %s at %s when tapped', async (label, expected) => {
      renderWithProviders(
        <AppFrame>
          <RouteProbe />
        </AppFrame>,
        { route: '/somewhere-else' }
      );

      await userEvent.click(screen.getByRole('button', { name: label }));

      expect(screen.getByTestId('pathname')).toHaveTextContent(expected);
    });

    /**
     * Add is not a route. Tapping it opens the sheet where you already are, rather than
     * navigating to /detailed and riding its redirect: that route still works, but arriving
     * through it never stamps a dismiss depth, so dismissing afterwards walks back to / instead
     * of to wherever the tab was tapped from.
     */
    it('opens the add sheet in place rather than navigating', async () => {
      renderWithProviders(
        <AppFrame>
          <RouteProbe />
        </AppFrame>,
        { route: '/history' }
      );

      await userEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/history');
      expect(screen.getByTestId('search')).toHaveTextContent('sheet=');
    });

    it('marks the current route\'s tab with aria-current', () => {
      renderWithProviders(
        <AppFrame>
          <div />
        </AppFrame>,
        { route: '/history' }
      );

      expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Quick' })).not.toHaveAttribute('aria-current');
    });
  });
});

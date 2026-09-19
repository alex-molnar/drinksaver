import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import AppFrame from './AppFrame';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useSheet } from '../hooks/useSheet';
import { ADD_SHEET_ID } from '../drink/draftReducer';
import { MENU_PANEL, type AddSheetPanel } from './AddSheet';

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

const AddSheetPanelProbe = () => {
  const { panels } = useSheet<AddSheetPanel>(ADD_SHEET_ID, MENU_PANEL);

  return <output data-testid="add-sheet-panels">{JSON.stringify(panels)}</output>;
};

describe('AppFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it('opens the header action menu with actions in product order', async () => {
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    const menuButton = screen.getByRole('button', { name: 'Open menu' });

    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton).toHaveAttribute('aria-controls', 'header-action-menu');
    expect(document.getElementById('header-action-menu')).toBeInTheDocument();
    expect(Array.from(screen.getByRole('menu').querySelectorAll('[role^="menuitem"]')).map((item) => item.textContent)).toEqual([
      'Recommendations',
      'Add new type',
      'Logout',
      'Light theme',
    ]);
  });

  it('puts a persistent light-theme toggle after every menu action', async () => {
    renderWithProviders(<AppFrame><div /></AppFrame>);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const toggle = screen.getByRole('menuitemcheckbox', { name: 'Light theme' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(localStorage.getItem('drinksaver-theme')).toBe('light');
  });

  it('navigates to the recommendations screen from the menu', async () => {
    renderWithProviders(
      <AppFrame>
        <RouteProbe />
      </AppFrame>,
      { route: '/history' }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const action = screen.getByRole('menuitem', { name: 'Recommendations' });

    expect(action).not.toHaveAttribute('aria-disabled');
    await userEvent.click(action);

    expect(screen.getByTestId('pathname')).toHaveTextContent('/recommendations');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the add sheet directly on the alcohol-type creation panel', async () => {
    renderWithProviders(
      <AppFrame>
        <RouteProbe />
        <AddSheetPanelProbe />
      </AppFrame>,
      { route: '/history' }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Add new type' }));

    expect(screen.getByTestId('pathname')).toHaveTextContent('/history');
    expect(screen.getByTestId('search')).toHaveTextContent('?sheet=add');
    expect(screen.getByTestId('add-sheet-panels')).toHaveTextContent(
      '[{"kind":"menu"},{"kind":"create","field":"alcoholType"}]'
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('signs out after the Logout menu action is activated', async () => {
    renderWithProviders(
      <AppFrame>
        <div />
      </AppFrame>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
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

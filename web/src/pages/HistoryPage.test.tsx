import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import HistoryPage from './HistoryPage';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useSaveQueue } from '../drink/useSaveQueue';
import type { EditableDrink } from '../types/api';
import type { DrinksForDate } from '../drink/useDrinksForDate';

vi.mock('../drink/useDrinksForDate');
vi.mock('../drink/useSaveQueue');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockUseDrinksForDate = vi.mocked(useDrinksForDate);
const mockUseSaveQueue = vi.mocked(useSaveQueue);
const mockRemove = vi.fn();

const mockDrinks: EditableDrink[] = [
  {
    id: 1,
    name: 'Heineken',
    alcoholTypeId: 4,
  },
  {
    id: 2,
    name: 'Red Wine',
    alcoholTypeId: 30,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDrinksForDate.mockReturnValue({ status: 'ready', rows: mockDrinks });
  mockUseSaveQueue.mockReturnValue({
    queue: { entries: [] },
    current: null,
    save: vi.fn(),
    remove: mockRemove,
    undo: vi.fn(),
    retry: vi.fn(),
    stripHandlers: { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() },
  });
});

const setStatus = (status: DrinksForDate) => mockUseDrinksForDate.mockReturnValue(status);

describe('HistoryPage', () => {
  it('renders a spinner while the read model is loading', () => {
    setStatus({ status: 'loading' });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the error state when the read model errors', () => {
    setStatus({ status: 'error' });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByText(/failed to load drinks/i)).toBeInTheDocument();
  });

  it('renders empty state when no drinks are recorded for the date', () => {
    setStatus({ status: 'ready', rows: [] });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByText(/no drinks recorded for this date/i)).toBeInTheDocument();
  });

  it('reads drinks for the selected date', () => {
    renderWithProviders(<HistoryPage />);

    expect(mockUseDrinksForDate).toHaveBeenCalled();
    const calls = mockUseDrinksForDate.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it('renders one card per drink', () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    expect(screen.getByText(/red wine/i)).toBeInTheDocument();
  });

  it('changes the date and reads for the new one', async () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.getByText(/heineken/i)).toBeInTheDocument();

    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-01-02');

    await waitFor(() => {
      const calls = mockUseDrinksForDate.mock.calls;
      expect(calls.some((call) => call[0] === '2026-01-02')).toBe(true);
    });
  });

  it('allows selecting individual drinks and shows delete FAB', async () => {
    renderWithProviders(<HistoryPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });
  });

  /** The deferred delete: selecting drinks and hitting the FAB defers through the queue. */
  it('defers a bulk delete through the queue, naming how many drinks', async () => {
    renderWithProviders(<HistoryPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    const deleteButton = screen.getByRole('button', { name: /delete selected/i });
    await userEvent.click(deleteButton);

    expect(mockRemove).toHaveBeenCalledWith({ label: '2 drinks', date: expect.any(String), drinkIds: [1, 2] });
  });

  it('defers a single delete through the queue, naming the drink', async () => {
    renderWithProviders(<HistoryPage />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const singleDeleteButton = deleteButtons.find((btn) => {
      const icon = within(btn).queryByTestId('DeleteIcon');
      return icon !== null;
    });

    expect(singleDeleteButton).toBeDefined();
    await userEvent.click(singleDeleteButton as HTMLElement);

    expect(mockRemove).toHaveBeenCalledWith({ label: 'Heineken', date: expect.any(String), drinkIds: [1] });
  });

  it('clears selection when date changes', async () => {
    renderWithProviders(<HistoryPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]); // Select a drink

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-01-02');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument();
    });
  });
});

/**
 * A regression test, and the one whose absence let a real bug through.
 *
 * History names are composed server side by AlcoholNameCollector and BeerNameCollector, so they
 * look like "Gin (Long drink - 0.25l)" and never match the drink identity table, which is keyed
 * by a recommendation's own name. Resolving on the name alone therefore drew the default glass
 * for every row ever saved. Nothing caught it because no test asserted on the glassware.
 *
 * The fixtures above are exactly that case: "Heineken" and "Red Wine" are not in the table, so
 * only their alcoholTypeId can put the right silhouette on screen.
 */
describe('the glass each row is drawn with', () => {
  it('uses the alcohol type id when the composed name is not in the identity table', () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.getByTestId('glass-pint')).toBeInTheDocument();
    expect(screen.getByTestId('glass-wine')).toBeInTheDocument();
    expect(screen.queryByTestId('glass-highball')).not.toBeInTheDocument();
  });
});

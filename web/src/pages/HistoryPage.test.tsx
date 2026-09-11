import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import HistoryPage from './HistoryPage';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useDayCounts } from '../drink/useDayCounts';
import { useSaveQueue } from '../drink/useSaveQueue';
import type { EditableDrink } from '../types/api';
import type { DrinksForDate } from '../drink/useDrinksForDate';

vi.mock('../drink/useDrinksForDate');
vi.mock('../drink/useDayCounts');
vi.mock('../drink/useSaveQueue');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockUseDrinksForDate = vi.mocked(useDrinksForDate);
const mockUseDayCounts = vi.mocked(useDayCounts);
const mockUseSaveQueue = vi.mocked(useSaveQueue);
const mockRemove = vi.fn();

/**
 * Names that look like what the server actually composes, not like the identity table's keys.
 * `AlcoholNameCollector` folds serving detail into the name itself, so a real History row reads
 * "Gin (Long drink - 0.25l)" and never matches the table by name. Keeping the fixtures honest is
 * what makes the identity lookup's second rung, the alcohol type id, do visible work here.
 */
const mockDrinks: EditableDrink[] = [
  { id: 1, name: 'Heineken Original (Draft/Tap - 0.50l)', alcoholTypeId: 4 },
  { id: 2, name: 'Red (Large glass - 0.30l)', alcoholTypeId: 30 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDrinksForDate.mockReturnValue({ status: 'ready', rows: mockDrinks });
  mockUseDayCounts.mockReturnValue(Array.from({ length: 7 }, () => ({ status: 'loading' as const })));
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

/** The row itself, by its exact accessible name. A regex would also match the nested cross-off
 *  control, whose own name contains the drink. */
const rowFor = (name: string) => screen.getByRole('button', { name });
const HEINEKEN = 'Heineken Original (Draft/Tap - 0.50l)';
const RED = 'Red (Large glass - 0.30l)';

describe('HistoryPage', () => {
  it('shows a loading state rather than an empty tab while the day is still arriving', () => {
    setStatus({ status: 'loading' });

    renderWithProviders(<HistoryPage />);

    // Not "nothing on this day": a day that has not arrived must never read as a day with
    // nothing on it, which is the same distinction the day strip rests on.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/nothing on this day/i)).not.toBeInTheDocument();
  });

  it('shows an error state when the day cannot be read', () => {
    setStatus({ status: 'error' });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows an empty state once the day is confirmed to have nothing on it', () => {
    setStatus({ status: 'ready', rows: [] });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByText(/nothing on this day/i)).toBeInTheDocument();
  });

  it('renders one row per drink', () => {
    renderWithProviders(<HistoryPage />);

    expect(rowFor(HEINEKEN)).toBeInTheDocument();
    expect(rowFor(RED)).toBeInTheDocument();
  });

  it('reads the newly chosen day when one is picked from the strip', async () => {
    renderWithProviders(<HistoryPage />);

    const yesterday = screen.getByRole('button', { name: /^yesterday,/i });
    await userEvent.click(yesterday);

    // The read model is asked for a different date than the one it opened on.
    const datesAsked = mockUseDrinksForDate.mock.calls.map(([d]) => d);
    expect(new Set(datesAsked).size).toBeGreaterThan(1);
  });

  it('defers a single delete through the queue, naming the drink', async () => {
    renderWithProviders(<HistoryPage />);

    await userEvent.click(within(rowFor(HEINEKEN)).getByRole('button', { name: /cross off/i }));

    expect(mockRemove).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Heineken Original (Draft/Tap - 0.50l)', drinkIds: [1] })
    );
  });

  it('defers a bulk delete through the queue, naming how many drinks', async () => {
    renderWithProviders(<HistoryPage />);

    await userEvent.click(rowFor(HEINEKEN));
    await userEvent.click(rowFor(RED));
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }));

    expect(mockRemove).toHaveBeenCalledWith(expect.objectContaining({ label: '2 drinks', drinkIds: [1, 2] }));
  });

  it('offers no bulk control until something is selected', () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument();
  });

  it('clears the selection when the day changes', async () => {
    renderWithProviders(<HistoryPage />);

    await userEvent.click(rowFor(HEINEKEN));
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^yesterday,/i }));

    expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument();
  });
});

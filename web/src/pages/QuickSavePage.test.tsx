import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import QuickSavePage from './QuickSavePage';
import { getRecommendations } from '../api/endpoints';
import { useAppNavigation } from '../hooks/useNavigation';
import { useSaveQueue } from '../drink/useSaveQueue';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import type { Recommendation } from '../types/api';
import type { SaveQueueContextType } from '../drink/SaveQueueContext';
import type { SaveQueueEntry } from '../drink/saveQueueReducer';

vi.mock('../api/endpoints');
vi.mock('../hooks/useNavigation');
vi.mock('../drink/useSaveQueue');
vi.mock('../drink/useDrinksForDate');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockGetRecommendations = vi.mocked(getRecommendations);
const mockUseNavigation = vi.mocked(useAppNavigation);
const mockUseSaveQueue = vi.mocked(useSaveQueue);
const mockUseDrinksForDate = vi.mocked(useDrinksForDate);

const navigateToDetailed = vi.fn();
const mockSave = vi.fn<SaveQueueContextType['save']>();

/** Mutated by individual tests to simulate the queue moving an entry through its lifecycle. */
let entries: SaveQueueEntry[] = [];

const stripHandlers = { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  entries = [];
  mockSave.mockReturnValue('save-1');
  mockUseNavigation.mockReturnValue({
    navigateToSuccess: vi.fn(),
    navigateToError: vi.fn(),
    navigateToDetailed,
    navigateToHome: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  mockUseDrinksForDate.mockReturnValue({ status: 'ready', rows: [] });
  mockUseSaveQueue.mockImplementation(() => ({
    queue: { entries },
    current: null,
    save: mockSave,
    remove: vi.fn(),
    undo: vi.fn(),
    retry: vi.fn(),
    stripHandlers,
  }));
});

/** Two recommendations whose id is null - the common case, since `DrinkKey.toRecommendation`
 *  never sets one - distinguished only by their other fields. */
const nullIdRecommendations: Recommendation[] = [
  { id: null as unknown as number, userId: 'user-1', name: 'Heineken pint', alcoholTypeId: 4, alcoholVolumeId: 10, brandId: 50 },
  { id: null as unknown as number, userId: 'user-1', name: 'Guinness pint', alcoholTypeId: 4, alcoholVolumeId: 10, brandId: 51 },
];

const savingEntry = (label: string): SaveQueueEntry => ({
  id: 'save-1',
  kind: 'save',
  status: 'saving',
  label,
  date: '2026-09-10',
  drinkIds: [],
  alcoholTypeId: 4,
  payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
  undoUntil: null,
  error: null,
  seq: 1,
  createdAt: 0,
});

describe('QuickSavePage', () => {
  /**
   * The regression this PR exists to fix. `IndexPage.tsx:118` keyed React's reconciliation on
   * `rec.id` alone, which is null for both of these, while the save state already keyed on the
   * composite. `PlateGrid` and this page now share one composite key for both purposes, so a
   * save on the second recommendation cannot ever mark the first.
   */
  it('renders two recommendations whose id is null as distinct plates, and shows the saving state on the second one only', async () => {
    mockGetRecommendations.mockResolvedValue(nullIdRecommendations);
    mockSave.mockImplementation(() => {
      entries = [savingEntry('Guinness pint')];
      return 'save-1';
    });

    const { rerender } = renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Guinness pint' }));
    rerender(<QuickSavePage />);

    expect(screen.getByRole('button', { name: 'Guinness pint' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Heineken pint' })).not.toHaveAttribute('aria-busy');
  });

  it('renders a spinner while the recommendations query is loading', () => {
    mockGetRecommendations.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<QuickSavePage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('still leaves "Something else" reachable when the query rejects, since it is the fallback for the automatic path', async () => {
    mockGetRecommendations.mockRejectedValue(new Error('API error'));

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load recommendations/i);
    });
    expect(screen.getByRole('button', { name: 'Something else' })).toBeEnabled();
  });

  it('renders one plate per recommendation, plus the trailing "Something else" plate', async () => {
    mockGetRecommendations.mockResolvedValue(nullIdRecommendations);

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
    });
  });

  it('navigates to the detailed form when "Something else" is tapped', async () => {
    mockGetRecommendations.mockResolvedValue([]);

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));

    expect(navigateToDetailed).toHaveBeenCalled();
  });

  it('saves a recommendation through the queue instead of navigating', async () => {
    mockGetRecommendations.mockResolvedValue(nullIdRecommendations);

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));

    expect(mockSave).toHaveBeenCalledWith({
      label: 'Heineken pint',
      date: expect.any(String),
      alcoholTypeId: 4,
      payload: {
        alcoholTypeId: 4,
        alcoholSubtypeId: undefined,
        alcoholVolumeId: 10,
        brandId: 50,
        beerFlavourId: undefined,
        consumptionTypeId: undefined,
      },
    });
    // Logging never navigates: the URL is asserted implicitly by never calling a navigate helper.
    expect(navigateToDetailed).not.toHaveBeenCalled();
  });

  it('disables the other plates while one is saving, and clears once the entry resolves', async () => {
    mockGetRecommendations.mockResolvedValue(nullIdRecommendations);
    mockSave.mockImplementation(() => {
      entries = [savingEntry('Heineken pint')];
      return 'save-1';
    });

    const { rerender } = renderWithProviders(<QuickSavePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));
    rerender(<QuickSavePage />);

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Something else' })).toBeDisabled();

    // The entry has left 'saving': the busy state clears, whatever the outcome. The strip
    // (tested separately) is what carries the outcome from here on.
    entries = [{ ...entries[0], status: 'undoable', undoUntil: Date.now() + 6500 }];
    rerender(<QuickSavePage />);

    expect(screen.queryByRole('button', { name: 'Heineken pint' })).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Heineken pint' })).toHaveAttribute('data-done', '');
    expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeEnabled();
  });

  it('shows the "Today" heading and count from AppFrame', async () => {
    mockGetRecommendations.mockResolvedValue([]);
    mockUseDrinksForDate.mockReturnValue({ status: 'ready', rows: [{ id: 1, name: 'Heineken pint', alcoholTypeId: 4 }] });

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^(Today|Tonight)$/ })).toBeInTheDocument();
    });
    expect(screen.getByText('1 so far')).toBeInTheDocument();
  });
});

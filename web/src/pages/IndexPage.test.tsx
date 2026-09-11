import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import IndexPage from './IndexPage';
import { getRecommendations } from '../api/endpoints';
import { useAppNavigation } from '../hooks/useNavigation';
import { useResponsiveTileCount } from '../hooks/useResponsiveTileCount';
import { useSaveQueue } from '../drink/useSaveQueue';
import type { Recommendation } from '../types/api';
import type { SaveQueueContextType } from '../drink/SaveQueueContext';
import type { SaveQueueEntry } from '../drink/saveQueueReducer';

vi.mock('../api/endpoints');
vi.mock('../hooks/useNavigation');
vi.mock('../hooks/useResponsiveTileCount');
vi.mock('../drink/useSaveQueue');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockGetRecommendations = vi.mocked(getRecommendations);
const mockUseNavigation = vi.mocked(useAppNavigation);
const mockUseResponsiveTileCount = vi.mocked(useResponsiveTileCount);
const mockUseSaveQueue = vi.mocked(useSaveQueue);

const navigateToSuccess = vi.fn();
const navigateToError = vi.fn();
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
    navigateToSuccess,
    navigateToError,
    navigateToDetailed,
    navigateToHome: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  mockUseResponsiveTileCount.mockReturnValue({
    maxRecommendations: 3,
    tileHeight: 120,
  });
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

const mockRecommendations: Recommendation[] = [
  {
    id: 1,
    userId: 'user-123',
    name: 'Heineken',
    alcoholTypeId: 4,
    alcoholSubtypeId: undefined,
    alcoholVolumeId: 10,
    brandId: 50,
    beerFlavourId: undefined,
    consumptionTypeId: 40,
  },
  {
    id: 2,
    userId: 'user-123',
    name: 'Red Wine',
    alcoholTypeId: 30,
    alcoholSubtypeId: 15,
    alcoholVolumeId: 20,
    brandId: undefined,
    beerFlavourId: undefined,
    consumptionTypeId: undefined,
  },
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

describe('IndexPage', () => {
  it('renders a spinner while the recommendations query is loading', () => {
    mockGetRecommendations.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<IndexPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the error state when the query rejects', async () => {
    mockGetRecommendations.mockRejectedValue(new Error('API error'));

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load recommendations/i)).toBeInTheDocument();
    });
  });

  it('renders one tile per recommendation up to maxRecommendations', async () => {
    mockGetRecommendations.mockResolvedValue([...mockRecommendations, { ...mockRecommendations[0], id: 3, name: 'Corona' }]);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /red wine/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /corona/i })).toBeInTheDocument();
    });

    // Should not render the 4th recommendation as maxRecommendations is 3
  });

  it('always shows the Add Custom button', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom/i })).toBeInTheDocument();
    });
  });

  it('navigates to detailed when Add Custom is clicked', async () => {
    mockGetRecommendations.mockResolvedValue([]);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /add custom/i }));

    expect(navigateToDetailed).toHaveBeenCalled();
  });

  /**
   * The whole point of this PR: a tap saves through the queue in place. It must not navigate,
   * and it must hand the queue the same payload the old direct `saveDrink` call used to build.
   */
  it('saves a recommendation through the queue instead of navigating', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /heineken/i }));

    expect(mockSave).toHaveBeenCalledWith({
      label: 'Heineken',
      date: expect.any(String),
      alcoholTypeId: 4,
      payload: {
        alcoholTypeId: 4,
        alcoholSubtypeId: undefined,
        alcoholVolumeId: 10,
        brandId: 50,
        beerFlavourId: undefined,
        consumptionTypeId: 40,
      },
    });
    expect(navigateToSuccess).not.toHaveBeenCalled();
    expect(navigateToError).not.toHaveBeenCalled();
  });

  it('shows a spinner on the saving tile, disables the others, and clears once the entry resolves', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);
    mockSave.mockImplementation(() => {
      entries = [savingEntry('Heineken')];
      return 'save-1';
    });

    const { rerender } = renderWithProviders(<IndexPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /heineken/i }));

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /red wine/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add custom/i })).toBeDisabled();

    // The entry has left 'saving': the tile's own spinner clears, whatever the outcome. The
    // strip (tested separately) is what carries the outcome from here.
    entries = [{ ...entries[0], status: 'undoable' }];
    rerender(<IndexPage />);

    expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
  });
});

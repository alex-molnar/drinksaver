import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import QuickSavePage from './QuickSavePage';
import { getRecommendations } from '../api/endpoints';
import { useSheet } from '../hooks/useSheet';
import { useSaveQueue } from '../drink/useSaveQueue';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import type { Recommendation } from '../types/api';
import type { SaveQueueContextType } from '../drink/SaveQueueContext';
import type { SaveQueueEntry } from '../drink/saveQueueReducer';
import { TEST_PALETTE_BY_NAME } from '../test/designFixtures';

vi.mock('../api/endpoints');
vi.mock('../hooks/useSheet');
vi.mock('../drink/useSaveQueue');
vi.mock('../drink/useDrinksForDate');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockGetRecommendations = vi.mocked(getRecommendations);
const mockUseSheet = vi.mocked(useSheet);
const mockUseSaveQueue = vi.mocked(useSaveQueue);
const mockUseDrinksForDate = vi.mocked(useDrinksForDate);

const openAddSheet = vi.fn();
const mockSave = vi.fn<SaveQueueContextType['save']>();

/** Mutated by individual tests to simulate the queue moving an entry through its lifecycle. */
let entries: SaveQueueEntry[] = [];

const stripHandlers = { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  entries = [];
  mockSave.mockReturnValue('save-1');
  mockUseSheet.mockReturnValue({
    isOpen: false,
    panels: [],
    open: openAddSheet,
    pushPanel: vi.fn(),
    popPanel: vi.fn(),
    dismiss: vi.fn(),
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
  { id: null as unknown as number, userId: 'user-1', name: 'Heineken pint', alcoholTypeId: 4, alcoholVolumeId: 10, brandId: 50, colorPaletteId: 1, glasswareId: 1 },
  { id: null as unknown as number, userId: 'user-1', name: 'Guinness pint', alcoholTypeId: 4, alcoholVolumeId: 10, brandId: 51, colorPaletteId: 2, glasswareId: 1 },
];

const savingEntry = (label: string): SaveQueueEntry => ({
  id: 'save-1',
  kind: 'save',
  status: 'saving',
  label,
  date: '2026-09-10',
  drinkIds: [],
  alcoholTypeId: 4,
  payload: { alcoholTypeId: 4, alcoholVolumeId: 10, colorPaletteId: 1, glasswareId: 1 },
  undoUntil: null,
  error: null,
  seq: 1,
  createdAt: 0,
});

describe('QuickSavePage', () => {
  it.each([
    { colorPaletteId: 1, glasswareId: 9, palette: TEST_PALETTE_BY_NAME.green, glass: 'palinka' },
    { colorPaletteId: 2, glasswareId: 1, palette: TEST_PALETTE_BY_NAME.brown, glass: 'pint' },
    { colorPaletteId: 3, glasswareId: 2, palette: TEST_PALETTE_BY_NAME.cream, glass: 'tulip' },
    { colorPaletteId: 4, glasswareId: 7, palette: TEST_PALETTE_BY_NAME.red, glass: 'coupe' },
    { colorPaletteId: 5, glasswareId: 4, palette: TEST_PALETTE_BY_NAME.blue, glass: 'highball' },
    { colorPaletteId: 6, glasswareId: 3, palette: TEST_PALETTE_BY_NAME.plum, glass: 'wine' },
    { colorPaletteId: 7, glasswareId: 5, palette: TEST_PALETTE_BY_NAME.amber, glass: 'rocks' },
    { colorPaletteId: 8, glasswareId: 8, palette: TEST_PALETTE_BY_NAME.rose, glass: 'flute' },
    { colorPaletteId: 7, glasswareId: 6, palette: TEST_PALETTE_BY_NAME.amber, glass: 'shot' },
    { colorPaletteId: 7, glasswareId: 10, palette: TEST_PALETTE_BY_NAME.amber, glass: 'beercan' },
    { colorPaletteId: 2, glasswareId: 11, palette: TEST_PALETTE_BY_NAME.brown, glass: 'beerbottle' },
    { colorPaletteId: 3, glasswareId: 12, palette: TEST_PALETTE_BY_NAME.cream, glass: 'beerjug' },
  ])('renders API palette $colorPaletteId and glassware $glasswareId on a recommendation tile', async ({ colorPaletteId, glasswareId, palette, glass }) => {
    const recommendation = {
      ...nullIdRecommendations[0],
      name: 'Custom pálinka (Small glass - 0.05l)',
      colorPaletteId,
      glasswareId,
    };
    mockGetRecommendations.mockResolvedValue([recommendation]);

    renderWithProviders(<QuickSavePage />);

    const tile = await screen.findByRole('button', { name: recommendation.name });
    expect(tile.style.getPropertyValue('--fld')).toBe(palette.field);
    expect(tile).toHaveStyle({ color: palette.inkDark });
    expect(within(tile).getByTestId(`glass-${glass}`)).toBeInTheDocument();
  });

  it.each([
    { colorPaletteId: undefined, glasswareId: undefined, palette: TEST_PALETTE_BY_NAME.cream, glass: 'highball' },
    { colorPaletteId: null, glasswareId: null, palette: TEST_PALETTE_BY_NAME.cream, glass: 'highball' },
    { colorPaletteId: 999, glasswareId: 999, palette: TEST_PALETTE_BY_NAME.cream, glass: 'highball' },
    { colorPaletteId: 0, glasswareId: 0, palette: TEST_PALETTE_BY_NAME.cream, glass: 'highball' },
    { colorPaletteId: 999, glasswareId: 9, palette: TEST_PALETTE_BY_NAME.cream, glass: 'palinka' },
    { colorPaletteId: 7, glasswareId: 999, palette: TEST_PALETTE_BY_NAME.amber, glass: 'highball' },
  ])('falls back independently for palette $colorPaletteId and glassware $glasswareId', async ({ colorPaletteId, glasswareId, palette, glass }) => {
    mockGetRecommendations.mockResolvedValue([{ ...nullIdRecommendations[0], colorPaletteId, glasswareId }]);

    renderWithProviders(<QuickSavePage />);

    const tile = await screen.findByRole('button', { name: 'Heineken pint' });
    expect(tile.style.getPropertyValue('--fld')).toBe(palette.field);
    expect(tile).toHaveStyle({ color: palette.inkDark });
    expect(within(tile).getByTestId(`glass-${glass}`)).toBeInTheDocument();
  });

  it('keeps appearance when the label changes and updates the same tile when design IDs change', async () => {
    mockGetRecommendations.mockResolvedValue([nullIdRecommendations[0]]);
    const { client } = renderWithProviders(<QuickSavePage />);
    const tile = await screen.findByRole('button', { name: 'Heineken pint' });
    const renamed = { ...nullIdRecommendations[0], name: 'My usual (Draft/Tap - 0.50l)' };

    act(() => client.setQueryData(['recommendations'], [renamed]));

    expect(await screen.findByRole('button', { name: renamed.name })).toBe(tile);
    expect(tile.style.getPropertyValue('--fld')).toBe(TEST_PALETTE_BY_NAME.green.field);
    expect(within(tile).getByTestId('glass-pint')).toBeInTheDocument();

    act(() => client.setQueryData(['recommendations'], [{ ...renamed, colorPaletteId: 8, glasswareId: 9 }]));

    await waitFor(() => expect(tile.style.getPropertyValue('--fld')).toBe(TEST_PALETTE_BY_NAME.rose.field));
    expect(screen.getByRole('button', { name: renamed.name })).toBe(tile);
    expect(tile).toHaveStyle({ color: TEST_PALETTE_BY_NAME.rose.inkDark });
    expect(within(tile).getByTestId('glass-palinka')).toBeInTheDocument();
  });

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

  it('renders skeleton placeholder tiles while the recommendations query is loading', () => {
    mockGetRecommendations.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<QuickSavePage />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('plate-skeleton')).toHaveLength(6);
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

  it('opens the add sheet in place when "Something else" is tapped', async () => {
    mockGetRecommendations.mockResolvedValue([]);

    renderWithProviders(<QuickSavePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));

    expect(openAddSheet).toHaveBeenCalled();
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
        colorPaletteId: 1,
        glasswareId: 1,
      },
    });
    // Logging never navigates, and never opens the sheet either.
    expect(openAddSheet).not.toHaveBeenCalled();
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

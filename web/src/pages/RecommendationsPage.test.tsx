import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import { useLocation } from 'react-router-dom';
import RecommendationsPage from './RecommendationsPage';
import { getRecommendations, editRecommendations, deleteRecommendation } from '../api/endpoints';
import type { Recommendation } from '../types/api';

const ME = '423c91e4-491f-4f82-aba6-3c982857e0e4';
const ADMIN = '00000000-0000-0000-0000-000000000001';

vi.mock('../api/endpoints');
vi.mock('../auth', () => ({ useAuth: () => ({ userId: ME, logout: vi.fn() }) }));
// AppFrame reads the day's drink count; this page does not care about it.
vi.mock('../drink/useDrinksForDate', () => ({ useDrinksForDate: () => ({ status: 'loading' }) }));

const rec = (over: Partial<Recommendation>) =>
  ({ id: 1, userId: ME, name: 'x', alcoholTypeId: 1, alcoholVolumeId: 1, ...over }) as Recommendation;

/** These 3 tests race the undo window's real setTimeout against the CI runner's scheduler when
 *  run against real timers, and no fixed `waitFor` budget is reliably safe (see git history: a
 *  10s budget still wasn't enough on a contended runner). A fake clock, advanced explicitly,
 *  removes the race entirely. They drive the DOM with `fireEvent` rather than `userEvent`:
 *  `userEvent` schedules its own real timers internally to simulate a human pointer/keyboard,
 *  which hangs forever once the global clock is faked. `fireEvent` dispatches synchronously
 *  with no timer of its own, so it stays compatible with `vi.useFakeTimers()`. Only `setTimeout`
 *  and `Date` are faked (not `queueMicrotask`/`setImmediate`), so React's own scheduling and the
 *  mocked API promises still flush normally between fake-timer advances. */
const withFakeTimers = async (run: () => Promise<void>) => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  try {
    await run();
  } finally {
    vi.useRealTimers();
  }
};

const LIST = [
  rec({ id: 7, name: 'HJ pint' }),
  rec({ id: 3, name: 'Office Chouffe' }),
  { ...rec({ name: 'Whisky' }), id: undefined } as unknown as Recommendation, // history-derived
  rec({ id: 99, userId: ADMIN, name: 'Heineken Pint' }),                      // admin default
];

/** Open the editor, replace the text, commit with the checkmark. */
const rename = async (from: string, to: string) => {
  await userEvent.click(screen.getByRole('button', { name: `Rename ${from}` }));
  await userEvent.clear(screen.getByRole('textbox'));
  await userEvent.type(screen.getByRole('textbox'), to);
  await userEvent.click(screen.getByRole('button', { name: `Save name for ${from}` }));
};

/** The `fireEvent` equivalent of `rename`, for use inside a fake-timer block. */
const renameSync = (from: string, to: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Rename ${from}` }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: `Save name for ${from}` }));
};

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRecommendations).mockResolvedValue(LIST);
  vi.mocked(editRecommendations).mockResolvedValue(LIST);
  vi.mocked(deleteRecommendation).mockResolvedValue(undefined);
});

describe('RecommendationsPage', () => {
  it('names the screen in the header', async () => {
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByRole('heading', { name: 'Recommendations' })).toBeInTheDocument();
  });

  it("lists only this user's saved rows", async () => {
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByText('HJ pint')).toBeInTheDocument();
    expect(screen.getByText('Office Chouffe')).toBeInTheDocument();
    expect(screen.queryByText('Whisky')).not.toBeInTheDocument();
    expect(screen.queryByText('Heineken Pint')).not.toBeInTheDocument();
  });

  it('offers no Save or Cancel until something actually changes', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows Save and Cancel once a name is renamed, and shows the new name', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');

    expect(screen.getByText('Home pint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('Cancel puts the original name back and clears the bar', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(editRecommendations).not.toHaveBeenCalled();
  });

  it('a delete crosses the row off at once and sends nothing yet', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));

    expect(await screen.findByText('HJ pint deleted.')).toBeInTheDocument();
    expect(deleteRecommendation).not.toHaveBeenCalled();
  });

  it('undoing a delete puts the row back and never sends', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Rename HJ pint' })).toBeInTheDocument();
    expect(deleteRecommendation).not.toHaveBeenCalled();
  });

  it('a delete does not raise Save or Cancel', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('Save offers undo first and sends the PATCH only when the window closes', async () => {
    await withFakeTimers(async () => {
      renderWithProviders(<RecommendationsPage undoWindowMs={30} />);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText('HJ pint')).toBeInTheDocument();

      renameSync('HJ pint', 'Home pint');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(() => vi.advanceTimersByTimeAsync(30));

      expect(screen.getByText('Changes saved.')).toBeInTheDocument();
      expect(editRecommendations).toHaveBeenCalledWith([
        { id: 7, name: 'Home pint' },
        { id: 3, name: 'Office Chouffe' },
      ]);
      expect(getRecommendations).toHaveBeenCalledTimes(1);
    });
  });

  it('redirects home after the edit response commits without refetching the list', async () => {
    await withFakeTimers(async () => {
      renderWithProviders(
        <>
          <RecommendationsPage undoWindowMs={30} />
          <LocationProbe />
        </>,
        { route: '/recommendations' },
      );
      await act(() => vi.advanceTimersByTimeAsync(0));

      renameSync('HJ pint', 'Home pint');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(() => vi.advanceTimersByTimeAsync(30));

      expect(screen.getByTestId('location')).toHaveTextContent('/');
      expect(getRecommendations).toHaveBeenCalledTimes(1);
    });
  });

  it('undoing a Save puts the list back and sends nothing', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(editRecommendations).not.toHaveBeenCalled();
  });

  it('a PATCH never carries a row the user deleted, and the DELETE goes first', async () => {
    await withFakeTimers(async () => {
      renderWithProviders(<RecommendationsPage undoWindowMs={30} />);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText('HJ pint')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));
      renameSync('Office Chouffe', 'Chouffe');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(() => vi.advanceTimersByTimeAsync(30));

      expect(editRecommendations).toHaveBeenCalledWith([{ id: 3, name: 'Chouffe' }]);
      expect(deleteRecommendation).toHaveBeenCalledWith(7);
    });
  });

  it('surfaces a failed save with a retry rather than pretending it landed', async () => {
    vi.mocked(editRecommendations).mockRejectedValue(new Error('boom'));
    await withFakeTimers(async () => {
      renderWithProviders(<RecommendationsPage undoWindowMs={20} />);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText('HJ pint')).toBeInTheDocument();

      renameSync('HJ pint', 'Home pint');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(() => vi.advanceTimersByTimeAsync(20));

      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save your changes.");
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  it('reorders with the keyboard and shows Save and Cancel', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Reorder HJ pint' }).focus();
    await user.keyboard('{ }');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ }');

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('reverts an in-progress rename on Escape without committing', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Rename HJ pint' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Home pint{Escape}');

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('reports a failed list read rather than showing an empty list', async () => {
    vi.mocked(getRecommendations).mockRejectedValue(new Error('boom'));
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/nothing saved yet/i)).not.toBeInTheDocument();
  });
});

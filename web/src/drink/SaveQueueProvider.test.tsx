import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup, configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../theme/muiTheme';
import { SaveQueueProvider } from './SaveQueueProvider';
import { useSaveQueue } from './useSaveQueue';
import { saveDrink, deleteDrinksByIds, getSavedDrinksByDate } from '../api/endpoints';
import type { SaveDrinkPayload } from './saveQueueReducer';
import { useState } from 'react';
import { useSetPageFeedbackContainer } from '../components/PageFeedbackContext';
import { SheetPortalContext } from '../components/AddSheet/SheetPortalContext';

vi.mock('../api/endpoints');
vi.mock('../auth/keycloak', () => ({ default: { token: 'test-token' } }));

// The undo window is injected long, rather than the real 6.5s, because these tests assert on a
// strip that only exists while the window is open. With the real window the suite's parallel
// workers can starve a jsdom worker long enough that the sweep commits the entry before React
// paints it, and the assertion then waits forever on something already gone. Raising the test
// timeout does not help, for the same reason: the strip is absent, not late. Nothing here
// asserts expiry; that belongs to saveQueueReducer.test.ts, which controls the clock directly.
const TEST_UNDO_WINDOW_MS = 120_000;

// Two separate problems, and both need solving. The window above stops the sweep committing an
// entry before React paints it. This raises the assertion budget, because the suite runs 24
// jsdom workers in parallel and a mocked promise, a dispatch and a render can genuinely take
// more than the default second on a saturated box. Raising this alone was not enough, and was
// what the first attempt got wrong: with the real window the strip was absent rather than late,
// so no timeout could have rescued it.
configure({ asyncUtilTimeout: 5_000 });
vi.setConfig({ testTimeout: 15_000 });

const mockSaveDrink = vi.mocked(saveDrink);
const mockDeleteDrinksByIds = vi.mocked(deleteDrinksByIds);
const mockGetSavedDrinksByDate = vi.mocked(getSavedDrinksByDate);

const DUVEL: SaveDrinkPayload = { alcoholTypeId: 4, alcoholVolumeId: 10 };
const HEINEKEN: SaveDrinkPayload = { alcoholTypeId: 4, alcoholVolumeId: 20 };

const Harness: React.FC = () => {
  const { save, remove, undo, retry } = useSaveQueue();
  return (
    <div>
      <button onClick={() => save({ label: 'Duvel bottle', date: '2026-09-10', alcoholTypeId: 4, payload: DUVEL })}>
        trigger-save-duvel
      </button>
      <button onClick={() => save({ label: 'Heineken pint', date: '2026-09-10', alcoholTypeId: 4, payload: HEINEKEN })}>
        trigger-save-heineken
      </button>
      <button onClick={() => remove({ label: 'Guinness pint', date: '2026-09-10', drinkIds: [7] })}>
        trigger-remove-guinness
      </button>
      <button onClick={undo}>reverse-action</button>
      <button onClick={retry}>attempt-again</button>
    </div>
  );
};

const renderProvider = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    client,
    ...render(
      <ThemeProvider theme={muiTheme}>
        <QueryClientProvider client={client}>
          <SaveQueueProvider undoWindowMs={TEST_UNDO_WINDOW_MS}>
            <Harness />
          </SaveQueueProvider>
        </QueryClientProvider>
      </ThemeProvider>
    ),
  };
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  mockGetSavedDrinksByDate.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SaveQueueProvider', () => {
  it('keeps undo alive when moving from a page slot into a sheet and back to the body', async () => {
    const PageSlot = () => <div data-testid="page-feedback" ref={useSetPageFeedbackContainer()} />;
    const Host = () => {
      const [pageMounted, setPageMounted] = useState(true);
      const [sheet, setSheet] = useState<HTMLElement | null>(null);
      const [sheetOpen, setSheetOpen] = useState(false);
      return (
        <SheetPortalContext.Provider value={{ container: sheet, setContainer: setSheet }}>
          <SaveQueueProvider undoWindowMs={TEST_UNDO_WINDOW_MS}>
            <Harness />
            {pageMounted && <PageSlot />}
            {sheetOpen && <div data-testid="sheet-feedback" ref={setSheet} />}
            <button onClick={() => setSheetOpen((open) => !open)}>toggle-sheet</button>
            <button onClick={() => setPageMounted(false)}>leave-page</button>
          </SaveQueueProvider>
        </SheetPortalContext.Provider>
      );
    };
    render(
      <ThemeProvider theme={muiTheme}>
        <QueryClientProvider client={new QueryClient()}><Host /></QueryClientProvider>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('trigger-remove-guinness'));
    expect(screen.getByTestId('page-feedback')).toContainElement(screen.getByRole('status'));
    expect(screen.getByRole('status')).toHaveStyle({ position: 'relative' });
    await userEvent.click(screen.getByText('toggle-sheet'));
    expect(screen.getByTestId('sheet-feedback')).toContainElement(screen.getByRole('status'));
    expect(screen.getByRole('status')).toHaveStyle({ position: 'fixed' });
    await userEvent.click(screen.getByText('toggle-sheet'));
    expect(screen.getByTestId('page-feedback')).toContainElement(screen.getByRole('status'));
    await userEvent.click(screen.getByText('leave-page'));
    expect(screen.getByRole('status').parentElement).toBe(document.body);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(mockDeleteDrinksByIds).not.toHaveBeenCalled();
  });

  it('renders its children', () => {
    renderProvider();
    expect(screen.getByText('trigger-save-duvel')).toBeInTheDocument();
  });

  it('saves immediately and raises an undo strip once the server confirms', async () => {
    mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
    renderProvider();

    await userEvent.click(screen.getByText('trigger-save-duvel'));

    expect(mockSaveDrink).toHaveBeenCalledWith({ ...DUVEL, date: '2026-09-10' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));
  });

  it('shows a failed save as an alert with a retry action', async () => {
    mockSaveDrink.mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    renderProvider();

    await userEvent.click(screen.getByText('trigger-save-duvel'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/duvel bottle/i));
  });

  it('undoes a save by deleting the ids the server returned', async () => {
    mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
    mockDeleteDrinksByIds.mockResolvedValue(1);
    renderProvider();

    await userEvent.click(screen.getByText('trigger-save-duvel'));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /undo/i }));

    await waitFor(() => expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([1]));
  });

  it('defers a delete until the window closes: no DELETE call fires immediately', async () => {
    renderProvider();

    await userEvent.click(screen.getByText('trigger-remove-guinness'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/guinness/i));
    expect(mockDeleteDrinksByIds).not.toHaveBeenCalled();
  });

  /** Rule 2: there is no undelete endpoint, so undoing a delete must mean it never happened. */
  it('undoing a delete never sends a DELETE at all', async () => {
    renderProvider();
    await userEvent.click(screen.getByText('trigger-remove-guinness'));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /undo/i }));

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(mockDeleteDrinksByIds).not.toHaveBeenCalled();
  });

  /** Rule 5. */
  it('supersedes an undoable save with a second one landing while it is still showing', async () => {
    mockSaveDrink
      .mockResolvedValueOnce([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }])
      .mockResolvedValueOnce([{ id: 2, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 20 }]);
    mockDeleteDrinksByIds.mockResolvedValue(1);
    renderProvider();

    await userEvent.click(screen.getByText('trigger-save-duvel'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));

    await userEvent.click(screen.getByText('trigger-save-heineken'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/heineken pint/i));

    // Only one strip: undo now must refer to the Heineken save, never to the superseded Duvel one.
    await userEvent.click(screen.getByRole('button', { name: /undo/i }));
    await waitFor(() => expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([2]));
    expect(mockDeleteDrinksByIds).not.toHaveBeenCalledWith([1]);
  });

  it('flushes a superseded pending delete for real, rather than silently dropping it', async () => {
    mockDeleteDrinksByIds.mockResolvedValue(1);
    mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
    renderProvider();

    await userEvent.click(screen.getByText('trigger-remove-guinness'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/guinness/i));

    await userEvent.click(screen.getByText('trigger-save-duvel'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));

    await waitFor(() => expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([7]));
  });

  describe('flushing a deferred delete on visibility loss', () => {
    it('fires a keepalive fetch (not the axios client) and commits when the tab becomes hidden', async () => {
      renderProvider();
      await userEvent.click(screen.getByText('trigger-remove-guinness'));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/drinks/byIds'),
        expect.objectContaining({
          method: 'DELETE',
          keepalive: true,
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });

    it('fires the same flush on pagehide', async () => {
      renderProvider();
      await userEvent.click(screen.getByText('trigger-remove-guinness'));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

      act(() => {
        window.dispatchEvent(new Event('pagehide'));
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/drinks/byIds'),
        expect.objectContaining({ method: 'DELETE', keepalive: true })
      );
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    });
  });

  it('persists a pending delete to sessionStorage and reconciles it on pageshow', async () => {
    renderProvider();
    await userEvent.click(screen.getByText('trigger-remove-guinness'));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

    const persisted = sessionStorage.getItem('drinksaver:pending-deletes');
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted as string)).toHaveLength(1);

    fetchMock.mockClear();
    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/drinks/byIds'),
      expect.objectContaining({ method: 'DELETE', keepalive: true })
    );
    await waitFor(() => expect(sessionStorage.getItem('drinksaver:pending-deletes')).toBeNull());
  });

  describe('cache effects', () => {
    it('invalidates the day as active and recommendations as none when a save resolves', async () => {
      mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      const { client } = renderProvider();
      const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

      await userEvent.click(screen.getByText('trigger-save-duvel'));

      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['drinks', '2026-09-10'], refetchType: 'active' })
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['recommendations'], refetchType: 'none' });
    });

    it('defers the recommendations refetch until the queue goes idle, then fires it', async () => {
      mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      mockDeleteDrinksByIds.mockResolvedValue(1);
      const { client } = renderProvider();
      const refetchSpy = vi.spyOn(client, 'refetchQueries');

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
      expect(refetchSpy).not.toHaveBeenCalledWith({ queryKey: ['recommendations'] });

      await userEvent.click(screen.getByRole('button', { name: /undo/i }));

      await waitFor(() => expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ['recommendations'] }));
    });
  });

  describe('retrying a failed save', () => {
    it('for a timeout, refetches the day first and skips the re-POST if the row count already rose', async () => {
      mockSaveDrink.mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED' });
      const { client } = renderProvider();
      client.setQueryData(['drinks', '2026-09-10'], []);

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

      mockGetSavedDrinksByDate.mockResolvedValue([{ id: 99, name: 'Duvel (Bottle - 0.33l)', alcoholTypeId: 4 }]);

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => expect(mockGetSavedDrinksByDate).toHaveBeenCalledWith('2026-09-10'));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(mockSaveDrink).toHaveBeenCalledTimes(1);
    });

    it('for a timeout, re-POSTs when the row count did not rise', async () => {
      mockSaveDrink
        .mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED' })
        .mockResolvedValueOnce([{ id: 5, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      const { client } = renderProvider();
      client.setQueryData(['drinks', '2026-09-10'], []);

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

      mockGetSavedDrinksByDate.mockResolvedValue([]);

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => expect(mockSaveDrink).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));
    });

    it('for a non-timeout failure, re-POSTs directly without a verifying refetch', async () => {
      mockSaveDrink
        .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })
        .mockResolvedValueOnce([{ id: 5, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      renderProvider();

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockGetSavedDrinksByDate).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));
    });

    it('for a timeout, falls back to a normal retry if the verifying refetch itself fails', async () => {
      mockSaveDrink
        .mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED' })
        .mockResolvedValueOnce([{ id: 9, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      const { client } = renderProvider();
      client.setQueryData(['drinks', '2026-09-10'], []);

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

      mockGetSavedDrinksByDate.mockRejectedValue(new Error('network down'));

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => expect(mockSaveDrink).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i));
    });

    it('is a no-op when nothing is failed', async () => {
      renderProvider();
      await userEvent.click(screen.getByText('attempt-again'));
      expect(mockSaveDrink).not.toHaveBeenCalled();
    });
  });

  describe('undoing', () => {
    it('is a no-op when nothing is undoable', async () => {
      renderProvider();
      await userEvent.click(screen.getByText('reverse-action'));
      expect(mockDeleteDrinksByIds).not.toHaveBeenCalled();
    });

    it('shows an alert if undoing a save fails', async () => {
      mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
      mockDeleteDrinksByIds.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
      renderProvider();

      await userEvent.click(screen.getByText('trigger-save-duvel'));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /undo/i }));

      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    });
  });

  it('does not crash when a superseded pending delete fails to flush, and the current strip is unaffected', async () => {
    mockDeleteDrinksByIds.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    mockSaveDrink.mockResolvedValue([{ id: 1, userId: 'u', date: '2026-09-10', alcoholTypeId: 4, alcoholVolumeId: 10 }]);
    renderProvider();

    await userEvent.click(screen.getByText('trigger-remove-guinness'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/guinness/i));

    await userEvent.click(screen.getByText('trigger-save-duvel'));

    await waitFor(() => expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([7]));
    expect(screen.getByRole('status')).toHaveTextContent(/duvel bottle/i);
  });

  it('does nothing on pageshow when nothing was persisted', async () => {
    renderProvider();
    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

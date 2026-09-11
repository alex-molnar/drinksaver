import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../theme/muiTheme';
import TapeStrip from './TapeStrip';
import type { SaveQueueEntry } from '../drink/saveQueueReducer';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderStrip = (entry: SaveQueueEntry | null, overrides: Partial<Parameters<typeof TapeStrip>[0]> = {}) =>
  render(
    <ThemeProvider theme={muiTheme}>
      <TapeStrip
        entry={entry}
        onUndo={vi.fn()}
        onRetry={vi.fn()}
        stripHandlers={{ onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() }}
        {...overrides}
      />
    </ThemeProvider>
  );

const saveEntry: SaveQueueEntry = {
  id: 's1',
  kind: 'save',
  status: 'undoable',
  label: 'Duvel bottle',
  date: '2026-09-10',
  drinkIds: [42],
  alcoholTypeId: 4,
  payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
  undoUntil: 7000,
  error: null,
  seq: 1,
  createdAt: 500,
};

const deleteEntry: SaveQueueEntry = {
  id: 'd1',
  kind: 'delete',
  status: 'undoable',
  label: 'Heineken',
  date: '2026-09-10',
  drinkIds: [7],
  undoUntil: 7000,
  error: null,
  seq: 1,
  createdAt: 500,
};

const failedEntry: SaveQueueEntry = {
  ...saveEntry,
  status: 'failed',
  error: { kind: 'offline', message: "You're offline." },
};

describe('TapeStrip', () => {
  it('renders nothing when there is no entry', () => {
    renderStrip(null);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces an undoable save with role status and names the drink', () => {
    renderStrip(saveEntry);
    const strip = screen.getByRole('status');
    expect(strip).toHaveTextContent(/duvel bottle/i);
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('announces an undoable delete with role status and names the drink', () => {
    renderStrip(deleteEntry);
    expect(screen.getByRole('status')).toHaveTextContent(/heineken/i);
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('calls onUndo when the Undo button is clicked', async () => {
    const onUndo = vi.fn();
    renderStrip(saveEntry, { onUndo });
    await userEvent.click(screen.getByRole('button', { name: /undo/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('uses role alert for a failed entry, and offers Retry instead of Undo', () => {
    renderStrip(failedEntry);
    const strip = screen.getByRole('alert');
    expect(strip).toHaveTextContent(/duvel bottle/i);
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when the Retry button is clicked', async () => {
    const onRetry = vi.fn();
    renderStrip(failedEntry, { onRetry });
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('spreads the timer handlers onto the strip root', async () => {
    const stripHandlers = { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() };
    renderStrip(saveEntry, { stripHandlers });

    await userEvent.hover(screen.getByRole('status'));
    expect(stripHandlers.onPointerEnter).toHaveBeenCalled();
  });

  it('renders into a portal on document.body, not inline', () => {
    const { container } = renderStrip(saveEntry);
    expect(container).toBeEmptyDOMElement();
    expect(screen.getByRole('status').closest('body')).toBe(document.body);
  });

  it('disables the Undo button while undoing, so a second click cannot double-fire', () => {
    renderStrip({ ...saveEntry, status: 'undoing' });
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
  });

  /**
   * Rule 6: a click landing during the exit must not fall through to whatever is now exposed
   * underneath. Going from an entry to null starts the exit; pointer-events must turn off at the
   * start of it, immediately, not only once the element is finally removed.
   */
  it('sets pointer-events to none the instant the entry disappears, before the exit finishes', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <ThemeProvider theme={muiTheme}>
        <TapeStrip
          entry={saveEntry}
          onUndo={vi.fn()}
          onRetry={vi.fn()}
          stripHandlers={{ onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() }}
        />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={muiTheme}>
        <TapeStrip
          entry={null}
          onUndo={vi.fn()}
          onRetry={vi.fn()}
          stripHandlers={{ onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() }}
        />
      </ThemeProvider>
    );

    const strip = screen.getByRole('status');
    expect(strip.style.pointerEvents).toBe('none');

    act(() => vi.runAllTimers());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { useRecommendationQueue } from './useRecommendationQueue';
import { deleteRecommendation, editRecommendations } from '../api/endpoints';
import type { DraftSnapshot } from './recommendationDraft';

vi.mock('../api/endpoints');

const mockEdit = vi.mocked(editRecommendations);
const mockDelete = vi.mocked(deleteRecommendation);

const SNAPSHOT: DraftSnapshot = {
  order: [7, 3],
  names: new Map([[7, 'HJ pint'], [3, 'Office Chouffe']]),
};
const onUndoSave = vi.fn();
const onSaveCommitted = vi.fn();

/** A thunk, so the payload is read at commit time and not when the save was raised. */
const payload = () => [{ id: 3, name: 'Office Chouffe' }];

const Probe: React.FC<{ windowMs: number }> = ({ windowMs }) => {
  const q = useRecommendationQueue({ onUndoSave, onSaveCommitted, undoWindowMs: windowMs });
  return (
    <>
      <button onClick={() => q.removeRecommendation({ recommendationId: 7, label: 'HJ pint' })}>del</button>
      <button onClick={() => q.saveArrangement({ snapshot: SNAPSHOT, payload })}>save</button>
      <button onClick={q.undo}>undo</button>
      <button onClick={q.retry}>retry</button>
      <output data-testid="hidden">{[...q.hidden].join(',')}</output>
      <output data-testid="status">{q.current?.status ?? 'idle'}</output>
    </>
  );
};

/** A fake clock, not a real setTimeout, is what keeps these tests deterministic: the undo
 *  window's expiry is exercised by advancing the clock explicitly rather than by racing a real
 *  timer against whatever the test runner's scheduler is doing. See `useUndoTimer.test.ts`,
 *  which this follows. Clicks use `fireEvent` rather than `userEvent`: `userEvent`'s own
 *  internal delay scheduling fights the fake clock and hangs, whereas `fireEvent` dispatches
 *  synchronously with no timer of its own.
 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockEdit.mockResolvedValue([]);
  mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRecommendationQueue', () => {
  it('hides the row immediately and sends nothing until the window closes', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('del'));

    expect(screen.getByTestId('hidden')).toHaveTextContent('7');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('sends the DELETE once the window closes', async () => {
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('del'));
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(mockDelete).toHaveBeenCalledWith(7);
  });

  it('undo inside the window restores the row and never sends', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('del'));
    fireEvent.click(screen.getByText('undo'));

    expect(screen.getByTestId('hidden')).toHaveTextContent('');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('flushes an open delete before the PATCH, so the order it sends is never a lie', async () => {
    render(<Probe windowMs={30} />);

    fireEvent.click(screen.getByText('del'));
    fireEvent.click(screen.getByText('save'));
    await act(() => vi.advanceTimersByTimeAsync(30));

    expect(mockEdit).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith(7);
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(mockEdit.mock.invocationCallOrder[0]);
  });

  it('sends the DELETE exactly once even though the save also waits on it', async () => {
    render(<Probe windowMs={30} />);

    fireEvent.click(screen.getByText('del'));
    fireEvent.click(screen.getByText('save'));
    await act(() => vi.advanceTimersByTimeAsync(30));

    expect(mockEdit).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('reads the payload at commit time, not when the save was raised', async () => {
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('save'));
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(mockEdit).toHaveBeenCalledWith([{ id: 3, name: 'Office Chouffe' }]);
  });

  it('passes the server-returned recommendation list to the commit callback', async () => {
    const updated = {
      id: 3,
      userId: 'user-1',
      name: 'Office Chouffe',
      alcoholTypeId: 1,
      alcoholVolumeId: 1,
    };
    mockEdit.mockResolvedValue([updated]);
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('save'));
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(onSaveCommitted).toHaveBeenCalledWith([updated]);
  });

  it('undoing a save hands the snapshot back and sends no PATCH', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('save'));
    fireEvent.click(screen.getByText('undo'));

    expect(onUndoSave).toHaveBeenCalledWith(SNAPSHOT);
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it('surfaces a failed delete and un-hides the row', async () => {
    mockDelete.mockRejectedValue(new Error('boom'));
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('del'));
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(screen.getByTestId('status')).toHaveTextContent('failed');
    expect(screen.getByTestId('hidden')).toHaveTextContent('');
  });

  it('surfaces a failed save', async () => {
    mockEdit.mockRejectedValue(new Error('boom'));
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('save'));
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(screen.getByTestId('status')).toHaveTextContent('failed');
  });

  it('retry sends the failed request again', async () => {
    mockDelete.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    render(<Probe windowMs={20} />);

    fireEvent.click(screen.getByText('del'));
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(screen.getByTestId('status')).toHaveTextContent('failed');

    fireEvent.click(screen.getByText('retry'));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('undo with nothing undoable is a no-op', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('undo'));

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it('retry with nothing failed is a no-op', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('retry'));

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('finalizes every open window when the page is hidden, so a backgrounded tab still sends', async () => {
    render(<Probe windowMs={10_000} />);

    fireEvent.click(screen.getByText('del'));
    expect(mockDelete).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockDelete).toHaveBeenCalledWith(7);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('re-sweeps against the real clock when the page becomes visible again', async () => {
    render(<Probe windowMs={10} />);

    fireEvent.click(screen.getByText('del'));
    // The window (10ms) has not yet elapsed by wall time, but the sweep on becoming visible
    // reads the clock itself, so advancing past it first is what makes the resweep find it open.
    await act(() => vi.advanceTimersByTimeAsync(10));

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockDelete).toHaveBeenCalledWith(7);
  });
});

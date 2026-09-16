import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/** A thunk, so the payload is read at commit time and not when the save was raised. */
const payload = () => [{ id: 3, name: 'Office Chouffe' }];

const Probe: React.FC<{ windowMs: number }> = ({ windowMs }) => {
  const q = useRecommendationQueue({ onUndoSave, undoWindowMs: windowMs });
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

beforeEach(() => {
  vi.clearAllMocks();
  mockEdit.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
});

describe('useRecommendationQueue', () => {
  it('hides the row immediately and sends nothing until the window closes', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('del'));

    expect(screen.getByTestId('hidden')).toHaveTextContent('7');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('sends the DELETE once the window closes', async () => {
    render(<Probe windowMs={20} />);

    await userEvent.click(screen.getByText('del'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(7));
  });

  it('undo inside the window restores the row and never sends', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('del'));
    await userEvent.click(screen.getByText('undo'));

    expect(screen.getByTestId('hidden')).toHaveTextContent('');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('flushes an open delete before the PATCH, so the order it sends is never a lie', async () => {
    render(<Probe windowMs={30} />);

    await userEvent.click(screen.getByText('del'));
    await userEvent.click(screen.getByText('save'));

    await waitFor(() => expect(mockEdit).toHaveBeenCalled());
    expect(mockDelete).toHaveBeenCalledWith(7);
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(mockEdit.mock.invocationCallOrder[0]);
  });

  it('sends the DELETE exactly once even though the save also waits on it', async () => {
    render(<Probe windowMs={30} />);

    await userEvent.click(screen.getByText('del'));
    await userEvent.click(screen.getByText('save'));

    await waitFor(() => expect(mockEdit).toHaveBeenCalled());
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('reads the payload at commit time, not when the save was raised', async () => {
    render(<Probe windowMs={20} />);

    await userEvent.click(screen.getByText('save'));

    await waitFor(() => expect(mockEdit).toHaveBeenCalledWith([{ id: 3, name: 'Office Chouffe' }]));
  });

  it('undoing a save hands the snapshot back and sends no PATCH', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('save'));
    await userEvent.click(screen.getByText('undo'));

    expect(onUndoSave).toHaveBeenCalledWith(SNAPSHOT);
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it('surfaces a failed delete and un-hides the row', async () => {
    mockDelete.mockRejectedValue(new Error('boom'));
    render(<Probe windowMs={20} />);

    await userEvent.click(screen.getByText('del'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(screen.getByTestId('hidden')).toHaveTextContent('');
  });

  it('surfaces a failed save', async () => {
    mockEdit.mockRejectedValue(new Error('boom'));
    render(<Probe windowMs={20} />);

    await userEvent.click(screen.getByText('save'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
  });

  it('retry sends the failed request again', async () => {
    mockDelete.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    render(<Probe windowMs={20} />);

    await userEvent.click(screen.getByText('del'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));

    await userEvent.click(screen.getByText('retry'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
  });

  it('undo with nothing undoable is a no-op', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('undo'));

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it('retry with nothing failed is a no-op', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('retry'));

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('finalizes every open window when the page is hidden, so a backgrounded tab still sends', async () => {
    render(<Probe windowMs={10_000} />);

    await userEvent.click(screen.getByText('del'));
    expect(mockDelete).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(7));

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('re-sweeps against the real clock when the page becomes visible again', async () => {
    render(<Probe windowMs={10} />);

    await userEvent.click(screen.getByText('del'));

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(7));
  });
});

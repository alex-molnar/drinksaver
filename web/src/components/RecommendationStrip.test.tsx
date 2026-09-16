import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationStrip from './RecommendationStrip';
import type { RecQueueEntry } from '../drink/recommendationQueue';

const handlers = { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() };

const del = (over: Partial<RecQueueEntry> = {}): RecQueueEntry => ({
  id: 'delete-1', kind: 'delete', status: 'undoable', recommendationId: 7, label: 'HJ pint',
  undoUntil: 1, error: null, seq: 1, createdAt: 0, ...over,
} as RecQueueEntry);

const save = (over: Partial<RecQueueEntry> = {}): RecQueueEntry => ({
  id: 'save-2', kind: 'save', status: 'undoable', snapshot: { order: [], names: new Map() },
  undoUntil: 1, error: null, seq: 2, createdAt: 0, ...over,
} as RecQueueEntry);

const renderStrip = (entry: RecQueueEntry | null) => {
  const onUndo = vi.fn();
  const onRetry = vi.fn();
  render(<RecommendationStrip entry={entry} onUndo={onUndo} onRetry={onRetry} stripHandlers={handlers} />);
  return { onUndo, onRetry };
};

beforeEach(() => vi.clearAllMocks());

describe('RecommendationStrip', () => {
  it('renders nothing while there is nothing to undo', () => {
    const { container } = render(
      <RecommendationStrip entry={null} onUndo={vi.fn()} onRetry={vi.fn()} stripHandlers={handlers} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('names the deleted row and offers undo', async () => {
    const { onUndo } = renderStrip(del());

    expect(screen.getByRole('status')).toHaveTextContent('HJ pint deleted.');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
  });

  it('reports a save without naming a row, because a save is about the whole list', () => {
    renderStrip(save());

    expect(screen.getByRole('status')).toHaveTextContent('Changes saved.');
  });

  it('raises a failed delete as an alert with a retry, not an undo', async () => {
    const { onRetry } = renderStrip(del({ status: 'failed', error: { kind: 'server', message: 'x' } }));

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't delete HJ pint.");
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('raises a failed save as an alert', () => {
    renderStrip(save({ status: 'failed', error: { kind: 'server', message: 'x' } }));

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save your changes.");
  });

  it('disables undo while it is already being honoured', () => {
    renderStrip(del({ status: 'undoing' }));

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('pauses the window while the pointer is inside it', async () => {
    renderStrip(del());

    await userEvent.hover(screen.getByRole('status'));

    expect(handlers.onPointerEnter).toHaveBeenCalled();
  });
});

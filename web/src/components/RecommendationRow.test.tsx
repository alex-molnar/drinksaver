import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import RecommendationRow, { type RecommendationRowProps } from './RecommendationRow';

const ROW = { id: 7, name: 'HJ pint' };

const handlers = () => ({
  onEditStart: vi.fn(),
  onEditChange: vi.fn(),
  onEditCommit: vi.fn(),
  onEditCancel: vi.fn(),
  onDelete: vi.fn(),
});

/** `useSortable` needs both contexts above it or it throws. */
const renderRow = (props: Partial<RecommendationRowProps> = {}) => {
  const spies = handlers();
  const merged = {
    row: ROW, index: 0, gone: false, editing: false, editingValue: '', reduced: true, ...spies, ...props,
  } as RecommendationRowProps;
  render(
    <DndContext>
      <SortableContext items={[ROW.id]}>
        <RecommendationRow {...merged} />
      </SortableContext>
    </DndContext>,
  );
  return spies;
};

beforeEach(() => vi.clearAllMocks());

describe('RecommendationRow', () => {
  it('shows the name, a grip, a pencil and a trashcan when at rest', () => {
    renderRow();

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder HJ pint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename HJ pint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete HJ pint' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reserves touch gestures for dragging without invoking iOS text selection', () => {
    renderRow();

    const grip = screen.getByRole('button', { name: 'Reorder HJ pint' });
    const row = grip.closest('[data-recommendation-row]');

    expect(grip).toHaveStyle({ touchAction: 'none', userSelect: 'none' });
    expect(grip).toHaveAttribute('aria-roledescription', 'sortable');
    expect(row).not.toHaveAttribute('role');
  });

  it('raises edit/start from the pencil', async () => {
    const spies = renderRow();

    await userEvent.click(screen.getByRole('button', { name: 'Rename HJ pint' }));

    expect(spies.onEditStart).toHaveBeenCalledWith(7);
  });

  it('swaps the pencil for a checkmark while editing, and shows the draft text', () => {
    renderRow({ editing: true, editingValue: 'Home pint' });

    expect(screen.getByRole('textbox', { name: 'Name for HJ pint' })).toHaveValue('Home pint');
    expect(screen.getByRole('button', { name: 'Save name for HJ pint' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename HJ pint' })).not.toBeInTheDocument();
  });

  it('commits on the checkmark', async () => {
    const spies = renderRow({ editing: true, editingValue: 'Home pint' });

    await userEvent.click(screen.getByRole('button', { name: 'Save name for HJ pint' }));

    expect(spies.onEditCommit).toHaveBeenCalled();
  });

  it('commits on Enter', async () => {
    const spies = renderRow({ editing: true, editingValue: 'Home pint' });

    await userEvent.type(screen.getByRole('textbox'), '{Enter}');

    expect(spies.onEditCommit).toHaveBeenCalled();
  });

  it('commits on blur, which is what clicking outside the box does', async () => {
    const spies = renderRow({ editing: true, editingValue: 'Home pint' });

    screen.getByRole('textbox').focus();
    await userEvent.tab();

    expect(spies.onEditCommit).toHaveBeenCalled();
  });

  it('reverts on Escape without committing', async () => {
    const spies = renderRow({ editing: true, editingValue: 'Home pint' });

    await userEvent.type(screen.getByRole('textbox'), '{Escape}');

    expect(spies.onEditCancel).toHaveBeenCalled();
    expect(spies.onEditCommit).not.toHaveBeenCalled();
  });

  it('reports every keystroke so the page owns the draft text', async () => {
    const spies = renderRow({ editing: true, editingValue: '' });

    await userEvent.type(screen.getByRole('textbox'), 'ab');

    expect(spies.onEditChange).toHaveBeenCalledTimes(2);
  });

  it('raises the delete with the row, so the strip can name it', async () => {
    const spies = renderRow();

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));

    expect(spies.onDelete).toHaveBeenCalledWith(ROW);
  });

  it('cannot be dragged or deleted while it is being struck off', () => {
    renderRow({ gone: true });

    expect(screen.getByRole('button', { name: 'Delete HJ pint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reorder HJ pint' })).toBeDisabled();
  });

  it('reports the exit once the strike-through has finished', () => {
    const onExitComplete = vi.fn();
    // reduced motion, so `strikeOff` finishes synchronously rather than waiting on WAAPI.
    renderRow({ gone: true, reduced: true, onExitComplete });

    expect(onExitComplete).toHaveBeenCalledWith(7);
  });
});

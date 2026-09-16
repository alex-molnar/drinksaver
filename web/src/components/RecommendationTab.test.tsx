import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationTab, { type RecommendationTabProps } from './RecommendationTab';

const ROWS = [
  { id: 7, name: 'HJ pint' },
  { id: 3, name: 'Office Chouffe' },
  { id: 9, name: 'Gin & Tonic' },
];

const spies = () => ({
  onReorder: vi.fn(),
  onEditStart: vi.fn(),
  onEditChange: vi.fn(),
  onEditCommit: vi.fn(),
  onEditCancel: vi.fn(),
  onDelete: vi.fn(),
  onExitComplete: vi.fn(),
});

const renderTab = (props: Partial<RecommendationTabProps> = {}) => {
  const s = spies();
  render(
    <RecommendationTab
      status="ready"
      rows={ROWS}
      goneIds={new Set()}
      editingId={null}
      editingValue=""
      {...s}
      {...props}
    />,
  );
  return s;
};

beforeEach(() => vi.clearAllMocks());

describe('RecommendationTab', () => {
  it('renders one row per recommendation, in the order given', () => {
    renderTab();

    const labels = screen
      .getAllByRole('button', { name: /^Reorder / })
      .map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Reorder HJ pint', 'Reorder Office Chouffe', 'Reorder Gin & Tonic']);
  });

  it('counts only the rows that are still there', () => {
    renderTab({ goneIds: new Set([7]) });

    expect(screen.getByText('2 saved')).toBeInTheDocument();
  });

  it('shows a loading state rather than an empty tab while the list is arriving', () => {
    renderTab({ status: 'loading', rows: [] });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/nothing saved yet/i)).not.toBeInTheDocument();
  });

  it('shows an error state when the list cannot be read', () => {
    renderTab({ status: 'error', rows: [] });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('explains how rows get here once the list is confirmed empty', () => {
    renderTab({ status: 'ready', rows: [] });

    expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument();
  });

  it('reorders with the keyboard, which is the accessible path to drag and drop', async () => {
    const s = renderTab();
    const user = userEvent.setup();

    screen.getByRole('button', { name: 'Reorder HJ pint' }).focus();
    await user.keyboard('{ }');          // pick up
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ }');          // drop

    expect(s.onReorder).toHaveBeenCalledWith([3, 7, 9]);
  });

  it('cancels a keyboard reorder on Escape without calling onReorder', async () => {
    const s = renderTab();
    const user = userEvent.setup();

    screen.getByRole('button', { name: 'Reorder HJ pint' }).focus();
    await user.keyboard('{ }');          // pick up
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');     // cancel

    expect(s.onReorder).not.toHaveBeenCalled();
  });

  it('passes the open editor down to the right row only', () => {
    renderTab({ editingId: 3, editingValue: 'Chouffe' });

    expect(screen.getByRole('textbox', { name: 'Name for Office Chouffe' })).toHaveValue('Chouffe');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });
});

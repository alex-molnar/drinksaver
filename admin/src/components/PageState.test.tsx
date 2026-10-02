import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageState } from './PageState';

describe('PageState', () => {
  it('distinguishes loading, retryable errors and filtered-empty results', async () => {
    const retry = vi.fn();
    const { rerender } = render(<PageState loading>Rows</PageState>);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    rerender(<PageState error="Access denied" onRetry={retry}>Rows</PageState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Access denied');
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<PageState empty filteredEmpty>Rows</PageState>);
    expect(screen.getByText(/no entries match/i)).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const DialogWithOpener = () => {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open confirmation</button>
    <ConfirmDialog open={open} title="Delete Porter" description="This cannot be undone." pending={false} onConfirm={() => setOpen(false)} onClose={() => setOpen(false)} />
  </>;
};

describe('ConfirmDialog', () => {
  it('labels the dialog, reports errors and keeps the draft open until dismissed', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete Porter" description="This cannot be undone." pending={false} error="Still referenced" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Delete Porter' })).toHaveTextContent('This cannot be undone.');
    expect(screen.getByRole('alert')).toHaveTextContent('Still referenced');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('returns focus to the opener after cancel', async () => {
    render(<DialogWithOpener />);
    const user = userEvent.setup();
    const opener = screen.getByRole('button', { name: 'Open confirmation' });
    await user.click(opener);
    await user.click(await screen.findByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

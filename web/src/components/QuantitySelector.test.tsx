import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuantitySelector from './QuantitySelector';

const decrease = () => screen.getByRole('button', { name: /decrease quantity/i });
const increase = () => screen.getByRole('button', { name: /increase quantity/i });

describe('QuantitySelector', () => {
  it('shows the current value', () => {
    render(<QuantitySelector value={3} onChange={vi.fn()} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('increments when the increase button is pressed', async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={3} onChange={onChange} />);

    await userEvent.click(increase());

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrements when the decrease button is pressed', async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={3} onChange={onChange} />);

    await userEvent.click(decrease());

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables the decrease button at the minimum', () => {
    render(<QuantitySelector value={1} onChange={vi.fn()} />);

    expect(decrease()).toBeDisabled();
    expect(increase()).toBeEnabled();
  });

  it('disables the increase button at the maximum', () => {
    render(<QuantitySelector value={9} onChange={vi.fn()} />);

    expect(increase()).toBeDisabled();
    expect(decrease()).toBeEnabled();
  });

  it('respects custom min and max', () => {
    render(<QuantitySelector value={5} onChange={vi.fn()} min={5} max={5} />);

    expect(decrease()).toBeDisabled();
    expect(increase()).toBeDisabled();
  });

  it('disables both buttons when disabled', () => {
    render(<QuantitySelector value={5} onChange={vi.fn()} disabled />);

    expect(decrease()).toBeDisabled();
    expect(increase()).toBeDisabled();
  });

  /**
   * The disabled attribute is the real guard, and the tests above cover it.
   * This one forces the click past that to prove the handler clamps on its own,
   * so the component stays correct if a future change styles the button as
   * enabled. pointerEventsCheck is off because user-event otherwise refuses to
   * click an element with pointer-events: none.
   */
  it('clamps in the handler even if the click gets through', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<QuantitySelector value={1} onChange={onChange} />);

    await user.click(decrease());

    expect(onChange).not.toHaveBeenCalled();
  });
});

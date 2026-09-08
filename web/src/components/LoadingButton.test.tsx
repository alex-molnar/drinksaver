import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import LoadingButton from './LoadingButton';

describe('LoadingButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when not loading', () => {
    const onClick = vi.fn();
    render(<LoadingButton onClick={onClick}>Save</LoadingButton>);

    expect(screen.getByText(/save/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('swaps children for a spinner when loading', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} loading={true}>
        Save
      </LoadingButton>
    );

    expect(screen.queryByText(/save/i)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('is disabled when loading is true', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} loading={true}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} disabled={true}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when either loading or disabled is true', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <LoadingButton onClick={onClick} loading={true} disabled={false}>
        Save
      </LoadingButton>
    );

    let button = screen.getByRole('button');
    expect(button).toBeDisabled();

    rerender(
      <LoadingButton onClick={onClick} loading={false} disabled={true}>
        Save
      </LoadingButton>
    );

    button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is enabled when both loading and disabled are false', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} loading={false} disabled={false}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('calls onClick when clicked and not disabled', async () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} loading={false} disabled={false}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalled();
  });

  /**
   * jsdom does not dispatch click on a disabled button, so this passes because
   * the button is disabled, which is what the assertion below states directly.
   * It still fails if the disabled wiring is removed.
   */
  it('does not call onClick when loading', async () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} loading={true}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 }).catch(() => {});

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <LoadingButton onClick={onClick} disabled={true}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 }).catch(() => {});

    expect(onClick).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppErrorBoundary from './AppErrorBoundary';

const RELOAD_ATTEMPT_KEY = 'drinksaver:chunk-reload-attempted-at';

/**
 * Throws whatever error it is given, during render. Error boundaries only
 * catch errors thrown while rendering, not ones thrown from an effect or an
 * event handler, so the throw has to happen in the component body.
 */
const Thrower = ({ error }: { error: Error }) => {
  throw error;
};

const chunkError = () => new Error('Failed to fetch dynamically imported module');

describe('AppErrorBoundary', () => {
  const realSessionStorage = window.sessionStorage;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // React logs every caught error to console.error on its own. Silencing it
    // keeps test output readable; it is restored in afterEach.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    realSessionStorage.clear();

    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: realSessionStorage,
    });
    realSessionStorage.clear();
  });

  it('renders children when nothing has thrown', () => {
    render(
      <AppErrorBoundary>
        <p>All good</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the updated-app message and a reload control for a chunk load failure', () => {
    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/app was updated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('renders a generic fallback with reload and home controls for any other error', () => {
    render(
      <AppErrorBoundary>
        <Thrower error={new Error('boom')} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  });

  it('records when it reloaded, so an immediate repeat can be recognised', async () => {
    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    await userEvent.click(screen.getByRole('button', { name: /reload/i }));

    const recordedAt = Number(realSessionStorage.getItem(RELOAD_ATTEMPT_KEY));
    expect(Date.now() - recordedAt).toBeLessThan(1000);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('falls through to the generic fallback when a reload was just attempted', () => {
    realSessionStorage.setItem(RELOAD_ATTEMPT_KEY, String(Date.now()));

    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/app was updated/i)).not.toBeInTheDocument();
  });

  /**
   * The reason the recorded value is a timestamp rather than a bare flag. With a flag there is
   * nowhere safe to clear it, so one recovered chunk error would suppress the useful message for
   * every genuine one afterwards, and offer only "something went wrong" for the rest of time.
   */
  it('still offers the reload for a chunk error long after an earlier attempt', () => {
    realSessionStorage.setItem(RELOAD_ATTEMPT_KEY, String(Date.now() - 60 * 60 * 1000));

    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/app was updated/i)).toBeInTheDocument();
  });

  it('ignores a garbled recorded value rather than trusting it', () => {
    realSessionStorage.setItem(RELOAD_ATTEMPT_KEY, 'not-a-number');

    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/app was updated/i)).toBeInTheDocument();
  });

  it('treats a sessionStorage read failure the same as no attempt recorded', () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new DOMException('blocked');
        },
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });

    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    expect(screen.getByText(/app was updated/i)).toBeInTheDocument();
  });

  it('still reloads when sessionStorage cannot be written to', async () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('blocked');
        },
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });

    render(
      <AppErrorBoundary>
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );

    await userEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('resets when its key changes, e.g. on navigation to a different route', () => {
    const { rerender } = render(
      <AppErrorBoundary key="/page-a">
        <Thrower error={chunkError()} />
      </AppErrorBoundary>
    );
    expect(screen.getByText(/app was updated/i)).toBeInTheDocument();

    rerender(
      <AppErrorBoundary key="/page-b">
        <p>fresh page</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('fresh page')).toBeInTheDocument();
    expect(screen.queryByText(/app was updated/i)).not.toBeInTheDocument();
  });
});

import { Component } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { classifyError } from '../errors';

/**
 * Guards against a reload loop: a chunk error, a reload, and the same chunk error again.
 * sessionStorage survives the reload that component state does not, which is why the guard
 * lives there.
 *
 * The stored value is the timestamp of the attempt, not a bare flag, and it only counts for a
 * few seconds. A bare flag is never safe to clear: the obvious place is a successful mount, but
 * a lazy import rejects *after* the boundary has mounted, so the clear would always run first
 * and the guard would never fire at all. Left uncleared instead, one recovered chunk error would
 * suppress the helpful message for every genuine one afterwards, forever. A loop happens within
 * a second or two; a real failure months later is far outside the window.
 */
const RELOAD_ATTEMPT_KEY = 'drinksaver:chunk-reload-attempted-at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

/** Every access is wrapped: some privacy modes throw on sessionStorage rather than returning null. */
const hasRecentReloadAttempt = (now: number): boolean => {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_ATTEMPT_KEY));
    return Number.isFinite(at) && at > 0 && now - at < RELOAD_GUARD_WINDOW_MS;
  } catch {
    return false;
  }
};

const recordReloadAttempt = (now: number): void => {
  try {
    sessionStorage.setItem(RELOAD_ATTEMPT_KEY, String(now));
  } catch {
    // Nothing to fall back to. Reloading without the attempt recorded is a smaller problem
    // than refusing to reload at all.
  }
};

interface Props {
  children: ReactNode;
}

interface State {
  kind: 'chunk' | 'other' | null;
}

/**
 * Colours are literals with a custom property in front of each. The stylesheet is one of the
 * things that can fail to load, and a fallback that renders bone on bone helps nobody, so the
 * literal is the floor rather than the intent. They are the dark ground and ink from the design
 * tokens, because the app is dark only.
 */
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  minHeight: '100vh',
  padding: '2rem',
  textAlign: 'center',
  fontFamily: 'system-ui, sans-serif',
  color: 'var(--ds-ink-primary, #F2E4CE)',
  backgroundColor: 'var(--ds-surface-ground, #231512)',
};

const messageStyle: CSSProperties = { fontSize: '1rem', margin: 0, maxWidth: '28rem', lineHeight: 1.5 };

const buttonStyle: CSSProperties = {
  fontSize: '1rem',
  padding: '0.75rem 1.5rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'var(--ds-accent-danger, #C4462E)',
  color: 'var(--ds-ink-primary, #FCEFD8)',
  cursor: 'pointer',
};

const linkStyle: CSSProperties = { fontSize: '0.9rem', color: 'var(--ds-ink-secondary, #F2E4CEB3)' };

/**
 * Wraps the lazy routes in App.tsx. Error boundaries have to be class components; React still
 * has no hook with the semantics of getDerivedStateFromError.
 *
 * Both fallbacks are plain elements with inline styles, and neither imports anything lazy. The
 * failure this exists to catch is usually a vendor chunk missing after a deploy, so a fallback
 * built out of MUI would be a fallback that fails to render for the very same reason.
 */
class AppErrorBoundary extends Component<Props, State> {
  state: State = { kind: null };

  static getDerivedStateFromError(error: unknown): State {
    const reloadWouldLoop = hasRecentReloadAttempt(Date.now());
    return { kind: classifyError(error) === 'chunk' && !reloadWouldLoop ? 'chunk' : 'other' };
  }

  handleReload = (): void => {
    recordReloadAttempt(Date.now());
    window.location.reload();
  };

  render(): ReactNode {
    const { kind } = this.state;

    if (kind === null) {
      return this.props.children;
    }

    if (kind === 'chunk') {
      return (
        <div style={containerStyle}>
          <p style={messageStyle}>The app was updated. Reload to get the latest version.</p>
          <button type="button" onClick={this.handleReload} style={buttonStyle}>
            Reload
          </button>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        <p style={messageStyle}>Something went wrong.</p>
        <button type="button" onClick={this.handleReload} style={buttonStyle}>
          Reload
        </button>
        <a href="/" style={linkStyle}>
          Back to home
        </a>
      </div>
    );
  }
}

export default AppErrorBoundary;

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import type { SaveQueueEntry } from '../drink/saveQueueReducer';
import type { UseUndoTimerHandlers } from '../hooks/useUndoTimer';

export interface TapeStripProps {
  /** The entry the strip shows, or null while nothing is undoable or failed. */
  entry: SaveQueueEntry | null;
  onUndo: () => void;
  onRetry: () => void;
  /** Spread onto the strip's root: pausing while focus or hover is inside it is what satisfies
   *  WCAG 2.2 SC 2.2.1 for this auto-expiring action. */
  stripHandlers: UseUndoTimerHandlers;
}

/** Brief enough to read as "gone", not as decoration - this PR is deliberately visually boring. */
const EXIT_MS = 150;

const messageFor = (entry: SaveQueueEntry): string => {
  if (entry.status === 'failed') {
    return entry.kind === 'save' ? `Couldn't save ${entry.label}.` : `Couldn't delete ${entry.label}.`;
  }
  return entry.kind === 'save' ? `${entry.label} saved.` : `${entry.label} deleted.`;
};

/**
 * The undo/error strip. `role="status"` normally; the failed variant is `role="alert"` and never
 * auto-dismisses (see `saveQueueReducer.ts`'s `currentStripEntry` - a failed entry only ever
 * leaves the strip by a retry succeeding or a newer action superseding it, never by a timer).
 *
 * Portalled to `document.body` with its own stacking context, so it survives whatever route is
 * mounted underneath it and a click during its exit cannot fall through to it: see the
 * `pointer-events` handling below.
 *
 * Styled with plain MUI vocabulary against the current theme palette, not the enamel plate look -
 * that arrives with the presentational components in a later PR. This one is deliberately boring.
 */
const TapeStrip: React.FC<TapeStripProps> = ({ entry, onUndo, onRetry, stripHandlers }) => {
  const [rendered, setRendered] = useState(entry);
  const [exiting, setExiting] = useState(false);
  // "Adjusting state when a prop changes", not an effect: both directions must be reflected in
  // this same render, since `rendered`/`exiting` are what the JSX below reads. The only thing
  // that genuinely needs an effect is the timer that later clears `rendered` to null - a real
  // side effect - which is why it is the one piece still below.
  const [prevEntry, setPrevEntry] = useState(entry);
  if (entry !== prevEntry) {
    setPrevEntry(entry);
    if (entry) {
      setRendered(entry);
      setExiting(false);
    } else {
      setExiting(true);
    }
  }

  useEffect(() => {
    if (entry) {
      return;
    }
    const timer = setTimeout(() => setRendered(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [entry]);

  if (!rendered) {
    return null;
  }

  const isError = rendered.status === 'failed';

  return createPortal(
    <Box
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onPointerEnter={stripHandlers.onPointerEnter}
      onPointerLeave={stripHandlers.onPointerLeave}
      onFocus={stripHandlers.onFocus}
      onBlur={stripHandlers.onBlur}
      sx={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 88, // above the bottom navigation
        zIndex: 1400,
        isolation: 'isolate',
      }}
      // A plain inline style, not sx: sx compiles to a generated class, and the whole point of
      // pointerEvents here is that it must land as an inline style toggled synchronously with
      // the exit, not a class swap whose timing is harder to reason about.
      style={{
        pointerEvents: exiting ? 'none' : 'auto',
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          bgcolor: isError ? 'error.main' : 'background.paper',
          color: isError ? 'error.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ flex: 1 }}>
          {messageFor(rendered)}
        </Typography>
        {isError ? (
          <Button color="inherit" onClick={onRetry} sx={{ minHeight: 'auto', minWidth: 'auto' }}>
            Retry
          </Button>
        ) : (
          <Button
            color="inherit"
            onClick={onUndo}
            disabled={rendered.status === 'undoing'}
            sx={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            Undo
          </Button>
        )}
      </Paper>
    </Box>,
    document.body
  );
};

export default TapeStrip;

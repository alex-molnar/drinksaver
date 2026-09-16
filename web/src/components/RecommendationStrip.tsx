import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import type { RecQueueEntry } from '../drink/recommendationQueue';
import type { UseUndoTimerHandlers } from '../hooks/useUndoTimer';

/**
 * The recommendations page's own undo/error strip. `role="status"` normally; the failed variant
 * is `role="alert"` and never auto-dismisses, since a failed entry only ever leaves the strip by
 * a retry succeeding or a newer action superseding it, never by a timer.
 *
 * Renders in flow, not through `createPortal`: unlike `TapeStrip`, this strip lives in the page's
 * own bar, below the list and above the Save and Cancel controls, so it never covers a row's
 * controls and needs no portal target.
 */
export interface RecommendationStripProps {
  entry: RecQueueEntry | null;
  onUndo: () => void;
  onRetry: () => void;
  /** Spread onto the strip's root: pausing while focus or hover is inside it is what satisfies
   *  WCAG 2.2 SC 2.2.1 for this auto-expiring action. */
  stripHandlers: UseUndoTimerHandlers;
}

/** Brief enough to read as "gone", not as decoration. */
const EXIT_MS = 150;

const messageFor = (entry: RecQueueEntry): string => {
  if (entry.status === 'failed') {
    return entry.kind === 'save' ? "Couldn't save your changes." : `Couldn't delete ${entry.label}.`;
  }
  return entry.kind === 'save' ? 'Changes saved.' : `${entry.label} deleted.`;
};

const RecommendationStrip: React.FC<RecommendationStripProps> = ({ entry, onUndo, onRetry, stripHandlers }) => {
  /**
   * A present entry renders directly. State is only involved on the way *out*, to keep the last
   * entry on screen for the exit transition after the queue has already dropped it.
   *
   * Mirroring the entry into state during render, and reading only that mirror, never showed
   * the strip for a delete: a delete becomes undoable in a single queue update, so the mirror
   * had to be adopted and re-rendered within one commit, and when that did not happen there was
   * nothing else for the JSX to read. Deriving the common case instead of mirroring it removes
   * the failure mode rather than timing it. See `TapeStrip.tsx`, which this is modelled on.
   */
  const lastShown = useRef(entry);
  const [exitingEntry, setExitingEntry] = useState<RecQueueEntry | null>(null);

  useEffect(() => {
    if (entry) {
      lastShown.current = entry;
      return;
    }
    const leaving = lastShown.current;
    if (!leaving) {
      return;
    }
    setExitingEntry(leaving);
    lastShown.current = null;
    const timer = setTimeout(() => setExitingEntry(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [entry]);

  const rendered = entry ?? exitingEntry;
  const exiting = !entry && rendered !== null;

  if (!rendered) {
    return null;
  }

  const isError = rendered.status === 'failed';

  return (
    <Box
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onPointerEnter={stripHandlers.onPointerEnter}
      onPointerLeave={stripHandlers.onPointerLeave}
      onFocus={stripHandlers.onFocus}
      onBlur={stripHandlers.onBlur}
      sx={{ m: 2 }}
      // A plain inline style, not sx: the whole point of pointerEvents here is that it must land
      // synchronously with the exit, not through a class swap whose timing is harder to reason about.
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
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
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
    </Box>
  );
};

export default RecommendationStrip;

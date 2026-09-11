import { useEffect, useRef, useState } from 'react';
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
  /**
   * Where to portal the strip. Defaults to `document.body`. `SaveQueueProvider` passes the add
   * sheet's own container while a sheet is open: MUI's `ModalManager` sets `aria-hidden` on every
   * `document.body` child that is not the open modal's own root, so a strip left on `document.body`
   * would be hidden from assistive technology and buried under the sheet's backdrop the instant it
   * opens. Rendering into the sheet's own container instead sidesteps that entirely, because the
   * strip is then a descendant of the exempted modal root rather than a hidden sibling of it. See
   * the design doc, "Saving is immediate, deleting is deferred".
   */
  container?: Element | null;
  /** A page slot reserves real space above navigation; sheet/body portals stay floating. */
  inline?: boolean;
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
 * Portalled to a page slot, the open sheet, or `document.body`. The queue keeps its lifetime
 * across navigation; page slots reserve space for the banner instead of covering row controls.
 * During exit, `pointer-events` prevents the fading banner from intercepting another action.
 *
 * Styled with plain MUI vocabulary against the current theme palette, not the enamel plate look -
 * that arrives with the presentational components in a later PR. This one is deliberately boring.
 */
const TapeStrip: React.FC<TapeStripProps> = ({ entry, onUndo, onRetry, stripHandlers, container, inline = false }) => {
  /**
   * A present entry renders directly. State is only involved on the way *out*, to keep the last
   * entry on screen for the exit transition after the queue has already dropped it.
   *
   * An earlier version mirrored the entry into state during render and read only that mirror.
   * It never showed the strip for a delete: a delete becomes undoable in a single queue update,
   * so the mirror had to be adopted and re-rendered within one commit, and when that did not
   * happen there was nothing else for the JSX to read. A save happened to survive it by going
   * through two dispatches, which is why the bug looked like it only affected deletes. Deriving
   * the common case instead of mirroring it removes the failure mode rather than timing it.
   */
  const lastShown = useRef(entry);
  const [exitingEntry, setExitingEntry] = useState<SaveQueueEntry | null>(null);

  useEffect(() => {
    if (entry) {
      // No need to clear `exitingEntry` here: `entry` already wins in the expression below, so a
      // stale one is unreachable, and clearing it synchronously in an effect only earns a
      // cascading-render lint error for nothing. The timer below clears it on its own.
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

  return createPortal(
    <Box
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onPointerEnter={stripHandlers.onPointerEnter}
      onPointerLeave={stripHandlers.onPointerLeave}
      onFocus={stripHandlers.onFocus}
      onBlur={stripHandlers.onBlur}
      sx={{
        position: inline ? 'relative' : 'fixed',
        left: inline ? undefined : 16,
        right: inline ? undefined : 16,
        bottom: inline ? undefined : 'calc(88px + env(safe-area-inset-bottom))',
        m: inline ? 2 : 0,
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
    </Box>,
    container ?? document.body
  );
};

export default TapeStrip;

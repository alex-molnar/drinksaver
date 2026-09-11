import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The undo window. 6.5s rather than the prototype's 4.8: see the design doc, "Saving is
 * immediate, deleting is deferred".
 */
export const UNDO_WINDOW_MS = 6_500;

export interface UseUndoTimerOptions {
  /** Wall clock ms the window ends at, or null while nothing is undoable. A timestamp, not a
   *  countdown, so it survives being read at an arbitrary later moment - see `saveQueueReducer.ts`. */
  undoUntil: number | null;
  /** Called once the window has genuinely elapsed, accounting for any pauses. */
  onExpire: () => void;
  /** Called on resume with the deadline pushed forward by however long the pause lasted. The
   *  caller is expected to feed this back as the next `undoUntil`; this hook does not assume it
   *  will, and simply waits rather than guessing at a new deadline itself. */
  onExtend: (undoUntil: number) => void;
  /** Reads the clock. Overridable so tests do not depend on the system clock. */
  now?: () => number;
}

export interface UseUndoTimerHandlers {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface UseUndoTimerResult {
  /** Spread onto the strip's root. Satisfies WCAG 2.2 SC 2.2.1: an auto-expiring action is a time
   *  limit, and pausing while focus or hover is inside the strip is this app's chosen way of
   *  giving the user control over it. */
  handlers: UseUndoTimerHandlers;
  isPaused: boolean;
}

/**
 * Schedules the undo window's expiry and implements its pause. Hover and focus are independent
 * engagement sources - tabbing to the Undo button while the pointer happens to already be over
 * the strip is ordinary keyboard use - so the window resumes only once *both* have released.
 */
export const useUndoTimer = ({
  undoUntil,
  onExpire,
  onExtend,
  now = Date.now,
}: UseUndoTimerOptions): UseUndoTimerResult => {
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovering || focused;

  const pausedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Latest callbacks and clock in refs, so this effect can depend on just `undoUntil` and
  // `paused` without resubscribing whenever a caller passes a fresh arrow function.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const onExtendRef = useRef(onExtend);
  onExtendRef.current = onExtend;
  const nowRef = useRef(now);
  nowRef.current = now;

  useEffect(() => {
    const clear = () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
    clear();

    if (paused) {
      pausedAtRef.current ??= nowRef.current();
      return;
    }

    if (pausedAtRef.current !== null) {
      const elapsed = nowRef.current() - pausedAtRef.current;
      pausedAtRef.current = null;
      if (undoUntil !== null && elapsed > 0) {
        // Wait for the extended undoUntil to come back as a prop rather than scheduling against
        // it directly here: scheduling against the still-stale `undoUntil` in this same pass
        // would fire almost immediately, since it has already elapsed while paused.
        onExtendRef.current(undoUntil + elapsed);
        return;
      }
    }

    if (undoUntil === null) {
      return;
    }

    const remaining = Math.max(0, undoUntil - nowRef.current());
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      onExpireRef.current();
    }, remaining);

    return clear;
  }, [undoUntil, paused]);

  const onPointerEnter = useCallback(() => setHovering(true), []);
  const onPointerLeave = useCallback(() => setHovering(false), []);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  return {
    handlers: { onPointerEnter, onPointerLeave, onFocus, onBlur },
    isPaused: paused,
  };
};

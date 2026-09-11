import { motionDurations, motionEasings } from '../theme/primitives';

export const HISTORY_MOVE = { duration: parseFloat(motionDurations.base), easing: motionEasings.decelerate };

/** Keep the row's layout intact while the pen draws, then fade it. Only completion removes it.
 * Cleanup cancels both phases, so Undo and date navigation cannot fire a stale completion. */
export function strikeOff(row: HTMLElement, stroke: HTMLElement, finish: () => void, reducedMotion: boolean): () => void {
  if (reducedMotion || !row.animate) {
    finish();
    return () => {};
  }
  let cancelled = false;
  const pen = stroke.animate(
    [{ transform: 'rotate(-1.2deg) scaleX(0)' }, { transform: 'rotate(-1.2deg) scaleX(1)' }],
    { ...HISTORY_MOVE, fill: 'forwards' },
  );
  let fade: Animation | undefined;
  void pen.finished.then(async () => {
    if (cancelled) return;
    fade = row.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: parseFloat(motionDurations.fast), easing: motionEasings.decelerate, fill: 'forwards',
    });
    await fade.finished;
    if (!cancelled) finish();
  }).catch(() => {
    // An external cancellation must not strand an invisible retained row. Our own cleanup
    // sets cancelled first, so Undo/unmount never reaches this completion path.
    if (!cancelled) finish();
  });
  return () => {
    cancelled = true;
    pen.cancel();
    fade?.cancel();
  };
}

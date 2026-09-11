import { afterEach, describe, expect, it, vi } from 'vitest';
import { strikeOff, HISTORY_MOVE } from './historyMotion';

function animation() {
  let resolve!: () => void;
  let reject!: () => void;
  const finished = new Promise<void>((yes, no) => { resolve = yes; reject = () => no(new DOMException('Cancelled', 'AbortError')); });
  return { finished, finish: resolve, cancel: vi.fn(reject) };
}
afterEach(() => vi.restoreAllMocks());

describe('strikeOff', () => {
  const setup = () => {
    const row = document.createElement('div');
    const stroke = document.createElement('span');
    const pen = animation();
    const fade = animation();
    row.animate = vi.fn().mockReturnValue(fade);
    stroke.animate = vi.fn().mockReturnValue(pen);
    const finish = vi.fn();
    return { row, stroke, pen, fade, finish };
  };
  const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

  it('draws before fading and only releases the row after both phases finish', async () => {
    const { row, stroke, pen, fade, finish } = setup();
    const cancel = strikeOff(row, stroke, finish, false);
    expect(stroke.animate).toHaveBeenCalledWith(
      [{ transform: 'rotate(-1.2deg) scaleX(0)' }, { transform: 'rotate(-1.2deg) scaleX(1)' }],
      { ...HISTORY_MOVE, fill: 'forwards' },
    );
    expect(row.animate).not.toHaveBeenCalled();
    pen.finish();
    await tick();
    expect(row.animate).toHaveBeenCalledWith([{ opacity: 1 }, { opacity: 0 }], expect.objectContaining({ duration: 120 }));
    expect(finish).not.toHaveBeenCalled();
    fade.finish();
    await tick();
    expect(finish).toHaveBeenCalledTimes(1);
    cancel();
  });

  it.each(['stroke', 'fade', 'queued completion'])('Undo during %s cancels motion without releasing the restored row', async (phase) => {
    const { row, stroke, pen, fade, finish } = setup();
    const cancel = strikeOff(row, stroke, finish, false);
    if (phase !== 'stroke') { pen.finish(); await tick(); }
    else pen.finish(); // A resolved promise whose continuation has not run is still cancellable.
    if (phase === 'queued completion') fade.finish();
    cancel();
    await tick();
    expect(pen.cancel).toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });

  it.each([true, false])('completes immediately for reduced motion or an unavailable animation API (%s)', (reduced) => {
    const { row, stroke, finish } = setup();
    if (!reduced) Object.defineProperty(row, 'animate', { value: undefined });
    strikeOff(row, stroke, finish, reduced)();
    expect(stroke.animate).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledOnce();
  });

  it('finishes a row if an animation is cancelled externally', async () => {
    const { row, stroke, pen, finish } = setup();
    strikeOff(row, stroke, finish, false);
    pen.cancel();
    await tick();
    expect(finish).toHaveBeenCalledOnce();
  });
});

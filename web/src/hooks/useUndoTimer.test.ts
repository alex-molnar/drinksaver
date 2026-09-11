import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoTimer, UNDO_WINDOW_MS } from './useUndoTimer';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('UNDO_WINDOW_MS', () => {
  it('is 6.5 seconds', () => {
    expect(UNDO_WINDOW_MS).toBe(6_500);
  });
});

describe('useUndoTimer', () => {
  it('calls onExpire when undoUntil elapses', () => {
    const onExpire = vi.fn();
    const onExtend = vi.fn();
    renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

    act(() => vi.advanceTimersByTime(6_499));
    expect(onExpire).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does nothing while undoUntil is null', () => {
    const onExpire = vi.fn();
    const onExtend = vi.fn();
    renderHook(() => useUndoTimer({ undoUntil: null, onExpire, onExtend }));

    act(() => vi.advanceTimersByTime(100_000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('reschedules when a fresh undoUntil arrives, for a new entry taking the strip', () => {
    const onExpire = vi.fn();
    const onExtend = vi.fn();
    const { rerender } = renderHook(({ undoUntil }) => useUndoTimer({ undoUntil, onExpire, onExtend }), {
      initialProps: { undoUntil: 6_500 as number | null },
    });

    act(() => vi.advanceTimersByTime(3_000));
    rerender({ undoUntil: 3_000 + 6_500 });
    act(() => vi.advanceTimersByTime(6_499));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending timer on unmount', () => {
    const onExpire = vi.fn();
    const onExtend = vi.fn();
    const { unmount } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  /** WCAG 2.2 SC 2.2.1: the whole reason this hook exists rather than a bare setTimeout. */
  describe('pausing on hover or focus', () => {
    it('prevents onExpire while the pointer is inside the strip', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

      act(() => result.current.handlers.onPointerEnter());
      expect(result.current.isPaused).toBe(true);

      act(() => vi.advanceTimersByTime(20_000));
      expect(onExpire).not.toHaveBeenCalled();
    });

    it('extends the window by exactly the paused duration on resume', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

      act(() => vi.advanceTimersByTime(1_000));
      act(() => result.current.handlers.onPointerEnter());
      act(() => vi.advanceTimersByTime(4_000)); // paused for 4s while at t=1000
      act(() => result.current.handlers.onPointerLeave());

      expect(onExtend).toHaveBeenCalledWith(6_500 + 4_000);
    });

    it('resuming reschedules against the extended deadline once the caller feeds it back', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result, rerender } = renderHook(
        ({ undoUntil }) => useUndoTimer({ undoUntil, onExpire, onExtend }),
        { initialProps: { undoUntil: 6_500 as number | null } }
      );

      act(() => vi.advanceTimersByTime(1_000));
      act(() => result.current.handlers.onPointerEnter());
      act(() => vi.advanceTimersByTime(4_000));
      act(() => result.current.handlers.onPointerLeave());

      const [extended] = onExtend.mock.calls[0] as [number];
      rerender({ undoUntil: extended });

      // Original deadline (6500) has long passed; onExpire must not have fired early.
      expect(onExpire).not.toHaveBeenCalled();

      const remaining = extended - Date.now();
      act(() => vi.advanceTimersByTime(remaining - 1));
      expect(onExpire).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('treats focus the same as hover', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

      act(() => result.current.handlers.onFocus());
      act(() => vi.advanceTimersByTime(20_000));
      expect(onExpire).not.toHaveBeenCalled();

      act(() => result.current.handlers.onBlur());
      expect(onExtend).toHaveBeenCalled();
    });

    it('only resumes once both hover and focus have released', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

      act(() => result.current.handlers.onPointerEnter());
      act(() => result.current.handlers.onFocus());
      act(() => vi.advanceTimersByTime(2_000));
      act(() => result.current.handlers.onPointerLeave()); // still focused
      expect(result.current.isPaused).toBe(true);
      expect(onExtend).not.toHaveBeenCalled();

      act(() => result.current.handlers.onBlur()); // now both released
      expect(result.current.isPaused).toBe(false);
      expect(onExtend).toHaveBeenCalledTimes(1);
    });

    it('does not extend when the pause was effectively instantaneous', () => {
      const onExpire = vi.fn();
      const onExtend = vi.fn();
      const { result } = renderHook(() => useUndoTimer({ undoUntil: 6_500, onExpire, onExtend }));

      act(() => {
        result.current.handlers.onPointerEnter();
        result.current.handlers.onPointerLeave();
      });

      expect(onExtend).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(6_500));
      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });
});

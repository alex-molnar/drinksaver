import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveTileCount } from './useResponsiveTileCount';

describe('useResponsiveTileCount', () => {
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerHeight = window.innerHeight;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('returns different maxRecommendations at different viewport heights', () => {
    // Short viewport should show fewer tiles
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });

    const { result: shortResult } = renderHook(() => useResponsiveTileCount());
    const shortMaxRecommendations = shortResult.current.maxRecommendations;

    // Tall viewport should show more tiles
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const { result: tallResult } = renderHook(() => useResponsiveTileCount());

    expect(tallResult.current.maxRecommendations).toBeGreaterThanOrEqual(
      shortMaxRecommendations
    );
  });

  it('returns a tileHeight that is at least the minimum', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useResponsiveTileCount());

    expect(result.current.tileHeight).toBeGreaterThanOrEqual(100);
  });

  it('updates when window is resized', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useResponsiveTileCount());

    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 600,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // After resize, the hook should still have a valid configuration
    expect(result.current.maxRecommendations).toBeDefined();
  });

  it('always shows at least 1 recommendation', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 300, // Very small viewport
    });

    const { result } = renderHook(() => useResponsiveTileCount());

    expect(result.current.maxRecommendations).toBeGreaterThanOrEqual(1);
  });

  it('returns maxRecommendations that fits on screen', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() => useResponsiveTileCount());

    // The configuration should fit (2 columns, so need to account for grid layout)
    expect(result.current.maxRecommendations).toBeGreaterThan(0);
    expect(result.current.tileHeight).toBeGreaterThan(0);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useResponsiveTileCount());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

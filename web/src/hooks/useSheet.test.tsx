import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSheet } from './useSheet';

type Panel = { kind: 'menu' } | { kind: 'option'; field: string };

const MENU: Panel = { kind: 'menu' };

const useHarness = () => ({ sheet: useSheet<Panel>('add', MENU), location: useLocation() });

const wrapperFrom =
  (initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries']) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;

describe('useSheet', () => {
  /**
   * The exact scenario named in the plan. `/history` is significant: dismissing must return to
   * the page the sheet was opened from, not to some hardcoded `/`, which is what a naive
   * `navigate('/')` fallback would get wrong.
   */
  it('dismissing a two-panel sheet opened from /history returns to /history with no sheet param, and does not leave the app', () => {
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperFrom(['/history']) });
    expect(result.current.location.pathname).toBe('/history');

    act(() => result.current.sheet.open());
    expect(result.current.location.pathname).toBe('/history');
    expect(result.current.location.search).toBe('?sheet=add');
    expect(result.current.sheet.isOpen).toBe(true);

    // A second panel, pushed as component state - not reflected in the URL at all, per the
    // design doc ("the panel stack inside it is component state, not URL").
    act(() => result.current.sheet.pushPanel({ kind: 'option', field: 'alcoholType' }));
    expect(result.current.sheet.panels).toHaveLength(2);
    expect(result.current.location.search).toBe('?sheet=add');

    act(() => result.current.sheet.dismiss());

    expect(result.current.location.pathname).toBe('/history');
    expect(result.current.location.search).toBe('');
    expect(result.current.sheet.isOpen).toBe(false);
  });

  it('open() preserves other search params already on the page', () => {
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperFrom(['/history?range=week']) });

    act(() => result.current.sheet.open());

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('range')).toBe('week');
    expect(params.get('sheet')).toBe('add');
  });

  /**
   * A cold load straight onto `?sheet=add` - a redirected stale `/detailed` bookmark, or a
   * shared link - has no router history to pop: `history.state` carries no dismiss depth,
   * because nothing in this session ever stamped one. Popping anyway (`navigate(-1)`) could
   * leave the app entirely; falling back to `replace` cannot.
   */
  it('falls back to a replace when there is no dismiss depth on the entry, rather than popping past the app', () => {
    const { result } = renderHook(() => useHarness(), {
      wrapper: wrapperFrom([{ pathname: '/', search: '?sheet=add' }]),
    });
    expect(result.current.sheet.isOpen).toBe(true);

    act(() => result.current.sheet.dismiss());

    expect(result.current.location.pathname).toBe('/');
    expect(result.current.location.search).toBe('');
    expect(result.current.sheet.isOpen).toBe(false);
  });

  describe('popPanel', () => {
    it('pops one level, leaving the sheet open', () => {
      const { result } = renderHook(() => useHarness(), { wrapper: wrapperFrom(['/']) });
      act(() => result.current.sheet.open());
      act(() => result.current.sheet.pushPanel({ kind: 'option', field: 'alcoholType' }));

      act(() => result.current.sheet.popPanel());

      expect(result.current.sheet.panels).toEqual([MENU]);
      expect(result.current.sheet.isOpen).toBe(true);
    });

    it('dismisses the whole sheet when there is nothing left to pop to', () => {
      const { result } = renderHook(() => useHarness(), { wrapper: wrapperFrom(['/']) });
      act(() => result.current.sheet.open());

      act(() => result.current.sheet.popPanel());

      expect(result.current.sheet.isOpen).toBe(false);
    });
  });

  it('open() resets the panel stack back to the initial panel', () => {
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperFrom(['/']) });
    act(() => result.current.sheet.open());
    act(() => result.current.sheet.pushPanel({ kind: 'option', field: 'alcoholType' }));
    expect(result.current.sheet.panels).toHaveLength(2);

    act(() => result.current.sheet.dismiss());
    act(() => result.current.sheet.open());

    expect(result.current.sheet.panels).toEqual([MENU]);
  });
});

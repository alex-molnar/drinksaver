import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DraftProvider } from './DraftProvider';
import { useDraft } from './useDraft';
import { initialDraftState } from './draftReducer';
import { drinkingDay } from './day';

const useHarness = () => ({ ...useDraft(), navigate: useNavigate() });

const wrapper =
  (route: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <DraftProvider>{children}</DraftProvider>
    </MemoryRouter>
  );

describe('DraftProvider', () => {
  it('starts with a fresh draft for today, whether or not the sheet is open', () => {
    const { result } = renderHook(() => useDraft(), { wrapper: wrapper('/') });

    expect(result.current.draft).toEqual(initialDraftState(drinkingDay(new Date())));
  });

  it('dispatches through to the reducer and re-renders with the new state', () => {
    const { result } = renderHook(() => useDraft(), { wrapper: wrapper('/') });

    act(() => {
      result.current.dispatch({ type: 'select', field: 'alcoholType', id: 2 });
    });

    expect(result.current.draft.alcoholTypeId).toBe(2);
  });

  it('resets the draft when the sheet transitions from closed to open, discarding prior choices', () => {
    const { result } = renderHook(() => useHarness(), { wrapper: wrapper('/') });

    act(() => {
      result.current.dispatch({ type: 'select', field: 'alcoholType', id: 2 });
    });
    expect(result.current.draft.alcoholTypeId).toBe(2);

    act(() => {
      result.current.navigate('/?sheet=add');
    });
    expect(result.current.draft).toEqual(initialDraftState(drinkingDay(new Date())));
  });

  it('a fresh mount straight onto ?sheet=add - a redirected stale bookmark - also starts clean', () => {
    const { result } = renderHook(() => useDraft(), { wrapper: wrapper('/?sheet=add') });

    expect(result.current.draft).toEqual(initialDraftState(drinkingDay(new Date())));
  });
});

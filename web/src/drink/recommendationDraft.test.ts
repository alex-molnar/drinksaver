import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  editPayload,
  isDirty,
  recommendationDraftReducer as reduce,
  snapshotOf,
  visibleRows,
  type RecommendationDraft,
} from './recommendationDraft';

const ROWS = [
  { id: 7, name: 'HJ pint' },
  { id: 3, name: 'Office Chouffe' },
  { id: 9, name: 'Gin & Tonic' },
];

const NONE = new Set<number>();
const synced = (): RecommendationDraft => reduce(EMPTY_DRAFT, { type: 'sync', rows: ROWS });
const names = (state: RecommendationDraft, hidden: ReadonlySet<number> = NONE) =>
  visibleRows(state, hidden).map((row) => row.name);

describe('recommendationDraftReducer', () => {
  it('adopts the server list on first sync', () => {
    expect(names(synced())).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);
    expect(isDirty(synced(), NONE)).toBe(false);
  });

  it('reorders to exactly the order the list was dropped into', () => {
    const state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });

    expect(names(state)).toEqual(['Office Chouffe', 'Gin & Tonic', 'HJ pint']);
    expect(isDirty(state, NONE)).toBe(true);
  });

  it('keeps a hidden row in its own slot, so undoing its delete restores it in place', () => {
    const hidden = new Set([3]);
    const state = reduce(synced(), { type: 'reorder', visibleOrder: [9, 7] });

    expect(names(state, hidden)).toEqual(['Gin & Tonic', 'HJ pint']);
    // The same state read without the delete: row 3 never left its middle slot.
    expect(names(state, NONE)).toEqual(['Gin & Tonic', 'Office Chouffe', 'HJ pint']);
  });

  it('holds the typed name aside until it is committed', () => {
    let state = reduce(synced(), { type: 'edit/start', id: 7 });
    state = reduce(state, { type: 'edit/change', value: 'Home pint' });

    expect(state.editingId).toBe(7);
    expect(state.editingValue).toBe('Home pint');
    expect(names(state)).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);

    state = reduce(state, { type: 'edit/commit' });

    expect(state.editingId).toBeNull();
    expect(names(state)).toEqual(['Home pint', 'Office Chouffe', 'Gin & Tonic']);
    expect(isDirty(state, NONE)).toBe(true);
  });

  it('trims a committed name', () => {
    let state = reduce(synced(), { type: 'edit/start', id: 7 });
    state = reduce(state, { type: 'edit/change', value: '  Home pint  ' });
    state = reduce(state, { type: 'edit/commit' });

    expect(names(state)).toEqual(['Home pint', 'Office Chouffe', 'Gin & Tonic']);
  });

  it('reverts rather than committing an empty name, so no row loses its label', () => {
    let state = reduce(synced(), { type: 'edit/start', id: 7 });
    state = reduce(state, { type: 'edit/change', value: '   ' });
    state = reduce(state, { type: 'edit/commit' });

    expect(names(state)).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);
    expect(isDirty(state, NONE)).toBe(false);
  });

  it('discards the typed name on edit/cancel', () => {
    let state = reduce(synced(), { type: 'edit/start', id: 7 });
    state = reduce(state, { type: 'edit/change', value: 'Home pint' });
    state = reduce(state, { type: 'edit/cancel' });

    expect(state.editingId).toBeNull();
    expect(names(state)).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);
  });

  it('cancel returns both order and names to the committed arrangement', () => {
    let state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });
    state = reduce(state, { type: 'edit/start', id: 7 });
    state = reduce(state, { type: 'edit/change', value: 'Home pint' });
    state = reduce(state, { type: 'edit/commit' });

    state = reduce(state, { type: 'cancel' });

    expect(names(state)).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);
    expect(isDirty(state, NONE)).toBe(false);
  });

  it('saved makes the current arrangement the one cancel returns to', () => {
    let state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });
    state = reduce(state, { type: 'saved' });

    expect(isDirty(state, NONE)).toBe(false);

    state = reduce(state, { type: 'cancel' });
    expect(names(state)).toEqual(['Office Chouffe', 'Gin & Tonic', 'HJ pint']);
  });

  it('restore puts back a snapshot, which is how undoing a save works', () => {
    const before = snapshotOf(synced());
    let state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });
    state = reduce(state, { type: 'saved' });

    state = reduce(state, { type: 'restore', snapshot: before });

    expect(names(state)).toEqual(['HJ pint', 'Office Chouffe', 'Gin & Tonic']);
    expect(isDirty(state, NONE)).toBe(false);
  });

  it('a background refetch does not overwrite unsaved work', () => {
    const state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });

    const after = reduce(state, { type: 'sync', rows: ROWS });

    expect(names(after)).toEqual(['Office Chouffe', 'Gin & Tonic', 'HJ pint']);
    expect(isDirty(after, NONE)).toBe(true);
  });

  it('a refetch adopts rows added elsewhere and drops ones the server no longer returns', () => {
    const after = reduce(synced(), {
      type: 'sync',
      rows: [{ id: 3, name: 'Office Chouffe' }, { id: 11, name: 'Duvel' }],
    });

    expect(names(after)).toEqual(['Office Chouffe', 'Duvel']);
  });

  it('a refetch while dirty keeps the arranged rows in their places', () => {
    const state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });

    const after = reduce(state, {
      type: 'sync',
      rows: [{ id: 3, name: 'Office Chouffe' }, { id: 11, name: 'Duvel' }],
    });

    // Row 3 keeps the front slot the user gave it; the new row lands at the end.
    expect(names(after)).toEqual(['Office Chouffe', 'Duvel']);
  });

  it('builds the payload in display order, excluding hidden rows, always carrying the name', () => {
    let state = reduce(synced(), { type: 'reorder', visibleOrder: [3, 9, 7] });
    state = reduce(state, { type: 'edit/start', id: 9 });
    state = reduce(state, { type: 'edit/change', value: 'G&T' });
    state = reduce(state, { type: 'edit/commit' });

    expect(editPayload(state, new Set([7]))).toEqual([
      { id: 3, name: 'Office Chouffe' },
      { id: 9, name: 'G&T' },
    ]);
  });

  it('is not dirty when the only change is a row that is hidden anyway', () => {
    const state = reduce(synced(), { type: 'reorder', visibleOrder: [7, 9] });

    expect(isDirty(state, new Set([3]))).toBe(false);
  });
});

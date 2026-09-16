import { describe, expect, it } from 'vitest';
import {
  EMPTY_REC_QUEUE,
  currentRecEntry,
  hiddenRecommendationIds,
  pendingDeletes,
  recQueueReducer as reduce,
  sweepRecQueue,
  type RecQueueState,
} from './recommendationQueue';

const SNAPSHOT = { order: [7, 3], names: new Map([[7, 'HJ pint'], [3, 'Office Chouffe']]) };
const T0 = 1_000_000;
const WINDOW = 6_500;

const withDelete = (state: RecQueueState = EMPTY_REC_QUEUE, recommendationId = 7, seq = 1) =>
  reduce(state, {
    type: 'delete/started',
    id: `delete-${seq}`,
    seq,
    now: T0,
    label: 'HJ pint',
    recommendationId,
    undoUntil: T0 + WINDOW,
  });

const withSave = (state: RecQueueState = EMPTY_REC_QUEUE, seq = 2) =>
  reduce(state, {
    type: 'save/started',
    id: `save-${seq}`,
    seq,
    now: T0,
    snapshot: SNAPSHOT,
    undoUntil: T0 + WINDOW,
  });

const fail = (state: RecQueueState, id: string) =>
  reduce(state, { type: 'op/failed', id, now: T0 + 7000, error: { kind: 'server', message: "Couldn't delete." } });

describe('recQueueReducer', () => {
  it('hides a row the moment its delete is queued, before anything is sent', () => {
    const state = withDelete();

    expect(hiddenRecommendationIds(state).has(7)).toBe(true);
    expect(currentRecEntry(state)?.status).toBe('undoable');
  });

  it('undoing a delete un-hides the row and leaves nothing to send', () => {
    let state = withDelete();
    state = reduce(state, { type: 'undo/requested', id: 'delete-1', now: T0 + 100 });
    state = reduce(state, { type: 'undo/succeeded', id: 'delete-1', now: T0 + 100 });

    expect(hiddenRecommendationIds(state).has(7)).toBe(false);
    expect(currentRecEntry(state)).toBeNull();
    expect(pendingDeletes(state)).toEqual([]);
  });

  it('the window expiring moves a delete to sending, which is what fires the DELETE', () => {
    const state = sweepRecQueue(withDelete(), T0 + WINDOW + 1);

    expect(state.entries[0].status).toBe('sending');
    expect(hiddenRecommendationIds(state).has(7)).toBe(true);
  });

  it('returns the same state when nothing is due, so a timer tick need not re-render', () => {
    const before = withDelete();

    expect(sweepRecQueue(before, T0 + 10)).toBe(before);
  });

  it('a save supersedes an open delete, sending it rather than dropping it', () => {
    const state = withSave(withDelete());

    expect(state.entries[0].status).toBe('sending');
    expect(currentRecEntry(state)?.kind).toBe('save');
    expect(pendingDeletes(state).map((e) => e.recommendationId)).toEqual([7]);
  });

  it('a second delete supersedes the first', () => {
    const state = withDelete(withDelete(), 3, 2);

    expect(state.entries[0].status).toBe('sending');
    expect(currentRecEntry(state)?.id).toBe('delete-2');
    expect([...hiddenRecommendationIds(state)].sort((a, b) => a - b)).toEqual([3, 7]);
  });

  it('a failed delete stops hiding its row, so the list tells the truth', () => {
    const state = fail(sweepRecQueue(withDelete(), T0 + WINDOW + 1), 'delete-1');

    expect(hiddenRecommendationIds(state).has(7)).toBe(false);
    expect(currentRecEntry(state)?.status).toBe('failed');
  });

  it('a failed entry stays on the strip until something supersedes it', () => {
    const state = fail(sweepRecQueue(withDelete(), T0 + WINDOW + 1), 'delete-1');

    expect(currentRecEntry(sweepRecQueue(state, T0 + 999_999))?.status).toBe('failed');
  });

  it('retrying a failed entry sends it again', () => {
    let state = fail(sweepRecQueue(withDelete(), T0 + WINDOW + 1), 'delete-1');
    state = reduce(state, { type: 'retry/requested', id: 'delete-1', now: T0 + 8000 });

    expect(state.entries[0].status).toBe('sending');
    expect(state.entries[0].error).toBeNull();
  });

  it('carries the snapshot a save undo restores', () => {
    const entry = currentRecEntry(withSave());

    expect(entry?.kind).toBe('save');
    expect(entry?.kind === 'save' && entry.snapshot).toBe(SNAPSHOT);
  });

  it('extends the window while the strip is engaged', () => {
    const state = reduce(withDelete(), {
      type: 'undo-window/extended',
      id: 'delete-1',
      now: T0 + 500,
      undoUntil: T0 + 9000,
    });

    expect(state.entries[0].undoUntil).toBe(T0 + 9000);
    expect(sweepRecQueue(state, T0 + WINDOW + 1)).toBe(state);
  });

  it('an undo that lands after the window closed changes nothing', () => {
    const swept = sweepRecQueue(withDelete(), T0 + WINDOW + 1);

    expect(reduce(swept, { type: 'undo/requested', id: 'delete-1', now: T0 + WINDOW + 2 })).toBe(swept);
  });

  it('commit finishes an entry and leaves the strip empty', () => {
    let state = sweepRecQueue(withDelete(), T0 + WINDOW + 1);
    state = reduce(state, { type: 'commit', id: 'delete-1', now: T0 + 7000 });

    expect(state.entries[0].status).toBe('committed');
    expect(currentRecEntry(state)).toBeNull();
    expect(hiddenRecommendationIds(state).has(7)).toBe(true);
  });

  it('an unrecognised action leaves the state unchanged', () => {
    const state = withDelete();

    expect(reduce(state, { type: 'not-a-real-action' } as never)).toBe(state);
  });
});

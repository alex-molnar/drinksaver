import { describe, it, expect } from 'vitest';
import {
  reduce,
  sweep,
  currentStripEntry,
  pendingInsertsForDate,
  suppressedIdsForDate,
  isQueueIdle,
  EMPTY_QUEUE,
  type SaveQueueState,
  type SaveQueueEntry,
} from './saveQueueReducer';

const PAYLOAD = { alcoholTypeId: 4, alcoholVolumeId: 10 };

describe('save/started', () => {
  it('appends a new entry in status saving, with no ids and no undo window yet', () => {
    const next = reduce(EMPTY_QUEUE, {
      type: 'save/started',
      id: 's1',
      seq: 1,
      now: 1000,
      label: 'Duvel bottle',
      date: '2026-09-10',
      alcoholTypeId: 4,
      payload: PAYLOAD,
    });

    expect(next.entries).toEqual([
      {
        id: 's1',
        kind: 'save',
        status: 'saving',
        label: 'Duvel bottle',
        date: '2026-09-10',
        drinkIds: [],
        alcoholTypeId: 4,
        payload: PAYLOAD,
        undoUntil: null,
        error: null,
        seq: 1,
        createdAt: 1000,
      },
    ]);
  });

  it('does not mutate the queue it is given', () => {
    const before: SaveQueueState = Object.freeze({ entries: [] });
    expect(() =>
      reduce(before, {
        type: 'save/started',
        id: 's1',
        seq: 1,
        now: 1000,
        label: 'Duvel bottle',
        date: '2026-09-10',
        alcoholTypeId: 4,
        payload: PAYLOAD,
      })
    ).not.toThrow();
  });
});

describe('save/succeeded', () => {
  const saving = reduce(EMPTY_QUEUE, {
    type: 'save/started',
    id: 's1',
    seq: 1,
    now: 1000,
    label: 'Duvel bottle',
    date: '2026-09-10',
    alcoholTypeId: 4,
    payload: PAYLOAD,
  });

  it('moves a saving entry to saved and records the ids the server returned', () => {
    const next = reduce(saving, { type: 'save/succeeded', id: 's1', now: 1200, drinkIds: [42] });

    expect(next.entries[0]).toMatchObject({ status: 'saved', drinkIds: [42] });
  });

  it('is a no-op for an id that is not in the queue', () => {
    const next = reduce(saving, { type: 'save/succeeded', id: 'nope', now: 1200, drinkIds: [42] });
    expect(next).toEqual(saving);
  });

  it('is a no-op if the entry is not currently saving', () => {
    const failed = reduce(saving, {
      type: 'op/failed',
      id: 's1',
      now: 1100,
      error: { kind: 'offline', message: 'offline' },
    });
    const next = reduce(failed, { type: 'save/succeeded', id: 's1', now: 1200, drinkIds: [42] });
    expect(next.entries[0].status).toBe('failed');
  });
});

describe('op/failed', () => {
  it('moves a saving entry to failed and records the error', () => {
    const saving = reduce(EMPTY_QUEUE, {
      type: 'save/started',
      id: 's1',
      seq: 1,
      now: 1000,
      label: 'Duvel bottle',
      date: '2026-09-10',
      alcoholTypeId: 4,
      payload: PAYLOAD,
    });

    const next = reduce(saving, {
      type: 'op/failed',
      id: 's1',
      now: 1100,
      error: { kind: 'offline', message: "You're offline." },
    });

    expect(next.entries[0]).toMatchObject({
      status: 'failed',
      error: { kind: 'offline', message: "You're offline." },
    });
  });

  it('is a no-op if the entry is not currently saving', () => {
    const committed: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'committed',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    const next = reduce(committed, {
      type: 'op/failed',
      id: 'd1',
      now: 6000,
      error: { kind: 'offline', message: 'x' },
    });
    expect(next).toEqual(committed);
  });
});

describe('undo-window/extended', () => {
  const undoable: SaveQueueState = {
    entries: [
      {
        id: 's1',
        kind: 'save',
        status: 'undoable',
        label: 'Duvel bottle',
        date: '2026-09-10',
        drinkIds: [42],
        alcoholTypeId: 4,
        payload: PAYLOAD,
        undoUntil: 7500,
        error: null,
        seq: 1,
        createdAt: 1000,
      },
    ],
  };

  /** What a hover/focus pause resumes into: the window pushed forward, not restarted. */
  it('pushes undoUntil forward on an undoable entry', () => {
    const next = reduce(undoable, { type: 'undo-window/extended', id: 's1', now: 6000, undoUntil: 11_500 });
    expect(next.entries[0]).toMatchObject({ status: 'undoable', undoUntil: 11_500 });
  });

  it('is a no-op once the entry is no longer undoable', () => {
    const committed: SaveQueueState = { entries: [{ ...undoable.entries[0], status: 'committed' }] };
    const next = reduce(committed, { type: 'undo-window/extended', id: 's1', now: 6000, undoUntil: 11_500 });
    expect(next).toEqual(committed);
  });
});

describe('undo-window/started', () => {
  const saved: SaveQueueState = {
    entries: [
      {
        id: 's1',
        kind: 'save',
        status: 'saved',
        label: 'Duvel bottle',
        date: '2026-09-10',
        drinkIds: [42],
        alcoholTypeId: 4,
        payload: PAYLOAD,
        undoUntil: null,
        error: null,
        seq: 1,
        createdAt: 1000,
      },
    ],
  };

  it('moves a saved entry to undoable and stamps undoUntil', () => {
    const next = reduce(saved, { type: 'undo-window/started', id: 's1', now: 1200, undoUntil: 7700 });
    expect(next.entries[0]).toMatchObject({ status: 'undoable', undoUntil: 7700 });
  });

  it('is a no-op if the entry is not currently saved', () => {
    const next = reduce(EMPTY_QUEUE, { type: 'undo-window/started', id: 'nope', now: 1200, undoUntil: 7700 });
    expect(next).toEqual(EMPTY_QUEUE);
  });

  /**
   * Rule 5: only one entry is ever undoable. A save's sibling needs no further network call to
   * finalize, so it goes straight to committed.
   */
  it('commits a sibling save that was already undoable', () => {
    const state: SaveQueueState = {
      entries: [
        { ...saved.entries[0], id: 'a', status: 'undoable', undoUntil: 5000 },
        { ...saved.entries[0], id: 'b', status: 'saved', undoUntil: null },
      ],
    };

    const next = reduce(state, { type: 'undo-window/started', id: 'b', now: 6000, undoUntil: 12500 });

    expect(next.entries.find((e) => e.id === 'a')).toMatchObject({ status: 'committed' });
    expect(next.entries.find((e) => e.id === 'b')).toMatchObject({ status: 'undoable', undoUntil: 12500 });
  });

  /**
   * A sibling delete has not been sent to the server at all yet, so superseding it must not
   * pretend it is finished. It moves to saving, which is what tells the provider's flush effect
   * to actually fire the DELETE.
   */
  it('flushes a sibling delete that was already undoable, rather than silently dropping it', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undoable',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 900,
        },
        { ...saved.entries[0], id: 'b', status: 'saved', undoUntil: null, seq: 2 },
      ],
    };

    const next = reduce(state, { type: 'undo-window/started', id: 'b', now: 6000, undoUntil: 12500 });

    expect(next.entries.find((e) => e.id === 'd1')).toMatchObject({ status: 'saving' });
  });
});

describe('delete/started', () => {
  it('creates an entry directly in undoable, with no saving/saved phase', () => {
    const next = reduce(EMPTY_QUEUE, {
      type: 'delete/started',
      id: 'd1',
      seq: 1,
      now: 1000,
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [7],
      undoUntil: 7500,
    });

    expect(next.entries).toEqual([
      {
        id: 'd1',
        kind: 'delete',
        status: 'undoable',
        label: 'Heineken',
        date: '2026-09-10',
        drinkIds: [7],
        undoUntil: 7500,
        error: null,
        seq: 1,
        createdAt: 1000,
      },
    ]);
  });

  it('supersedes a sibling that was already undoable', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'a',
          kind: 'save',
          status: 'undoable',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [1],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 900,
        },
      ],
    };

    const next = reduce(state, {
      type: 'delete/started',
      id: 'd1',
      seq: 2,
      now: 1000,
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [7],
      undoUntil: 7500,
    });

    expect(next.entries.find((e) => e.id === 'a')).toMatchObject({ status: 'committed' });
  });
});

describe('undo/requested', () => {
  it('moves an undoable entry to undoing', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undoable',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 7500,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };

    const next = reduce(state, { type: 'undo/requested', id: 'd1', now: 1200 });
    expect(next.entries[0].status).toBe('undoing');
  });

  /**
   * The whole point of rule 6: undo must not race its own timeout. A click that lands after
   * sweep has already committed the entry must be a no-op, not a crash and not a resurrection.
   */
  it('is a no-op on an entry that has already committed', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'committed',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 7500,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };

    const next = reduce(state, { type: 'undo/requested', id: 'd1', now: 9000 });
    expect(next).toEqual(state);
  });
});

describe('undo/succeeded and undo/failed', () => {
  const undoing: SaveQueueState = {
    entries: [
      {
        id: 's1',
        kind: 'save',
        status: 'undoing',
        label: 'Duvel bottle',
        date: '2026-09-10',
        drinkIds: [42],
        alcoholTypeId: 4,
        payload: PAYLOAD,
        undoUntil: 7500,
        error: null,
        seq: 1,
        createdAt: 1000,
      },
    ],
  };

  it('undo/succeeded moves undoing to undone', () => {
    const next = reduce(undoing, { type: 'undo/succeeded', id: 's1', now: 1300 });
    expect(next.entries[0].status).toBe('undone');
  });

  it('undo/failed moves undoing to failed and records the error', () => {
    const next = reduce(undoing, {
      type: 'undo/failed',
      id: 's1',
      now: 1300,
      error: { kind: 'server', message: 'Server error' },
    });
    expect(next.entries[0]).toMatchObject({ status: 'failed', error: { kind: 'server', message: 'Server error' } });
  });

  it('undo/succeeded is a no-op when the entry is not undoing', () => {
    const saved: SaveQueueState = { entries: [{ ...undoing.entries[0], status: 'saved' }] };
    expect(reduce(saved, { type: 'undo/succeeded', id: 's1', now: 1300 })).toEqual(saved);
  });

  it('undo/failed is a no-op when the entry is not undoing', () => {
    const saved: SaveQueueState = { entries: [{ ...undoing.entries[0], status: 'saved' }] };
    const next = reduce(saved, { type: 'undo/failed', id: 's1', now: 1300, error: { kind: 'server', message: 'x' } });
    expect(next).toEqual(saved);
  });
});

describe('retry/requested', () => {
  it('moves a failed entry back to saving and clears the error', () => {
    const failed: SaveQueueState = {
      entries: [
        {
          id: 's1',
          kind: 'save',
          status: 'failed',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: null,
          error: { kind: 'offline', message: "You're offline." },
          seq: 1,
          createdAt: 1000,
        },
      ],
    };

    const next = reduce(failed, { type: 'retry/requested', id: 's1', now: 2000 });
    expect(next.entries[0]).toMatchObject({ status: 'saving', error: null });
  });

  it('is a no-op on an entry that is not failed', () => {
    const saving: SaveQueueState = {
      entries: [
        {
          id: 's1',
          kind: 'save',
          status: 'saving',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: null,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(reduce(saving, { type: 'retry/requested', id: 's1', now: 2000 })).toEqual(saving);
  });
});

describe('commit', () => {
  it('moves an undoable entry to committed', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undoable',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 7500,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(reduce(state, { type: 'commit', id: 'd1', now: 8000 }).entries[0].status).toBe('committed');
  });

  it('moves a saving entry to committed, for a flush that has just succeeded', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'saving',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 7500,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(reduce(state, { type: 'commit', id: 'd1', now: 8000 }).entries[0].status).toBe('committed');
  });

  it('is a no-op on an entry already undone', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undone',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 7500,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(reduce(state, { type: 'commit', id: 'd1', now: 8000 })).toEqual(state);
  });
});

describe('sweep', () => {
  it('commits an overdue undoable save directly, with no further network call needed', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 's1',
          kind: 'save',
          status: 'undoable',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [42],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(sweep(state, 5000).entries[0].status).toBe('committed');
  });

  it('moves an overdue undoable delete to saving, so the provider flushes it', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undoable',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(sweep(state, 5000).entries[0].status).toBe('saving');
  });

  it('leaves an entry alone before its window has elapsed', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 'd1',
          kind: 'delete',
          status: 'undoable',
          label: 'Heineken',
          date: '2026-09-10',
          drinkIds: [7],
          undoUntil: 5000,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(sweep(state, 4999).entries[0].status).toBe('undoable');
  });

  it('returns the same reference when nothing is overdue, so the caller can bail out of a re-render', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 's1',
          kind: 'save',
          status: 'saved',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [42],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: null,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(sweep(state, 999_999)).toBe(state);
  });
});

describe('currentStripEntry', () => {
  it('is null for an empty queue', () => {
    expect(currentStripEntry(EMPTY_QUEUE)).toBeNull();
  });

  it('is null when every entry is saving, committed or undone', () => {
    const state: SaveQueueState = {
      entries: [
        {
          id: 's1',
          kind: 'save',
          status: 'committed',
          label: 'Duvel bottle',
          date: '2026-09-10',
          drinkIds: [42],
          alcoholTypeId: 4,
          payload: PAYLOAD,
          undoUntil: null,
          error: null,
          seq: 1,
          createdAt: 1000,
        },
      ],
    };
    expect(currentStripEntry(state)).toBeNull();
  });

  it('picks the most recently created undoable, undoing or failed entry', () => {
    const older: SaveQueueEntry = {
      id: 'a',
      kind: 'save',
      status: 'undoable',
      label: 'Duvel bottle',
      date: '2026-09-10',
      drinkIds: [1],
      alcoholTypeId: 4,
      payload: PAYLOAD,
      undoUntil: 5000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    const newer: SaveQueueEntry = { ...older, id: 'b', seq: 2, createdAt: 1500, status: 'failed', error: { kind: 'offline', message: 'x' } };

    expect(currentStripEntry({ entries: [older, newer] })?.id).toBe('b');
    expect(currentStripEntry({ entries: [newer, older] })?.id).toBe('b');
  });
});

describe('pendingInsertsForDate', () => {
  const base: SaveQueueEntry = {
    id: 's1',
    kind: 'save',
    status: 'undoable',
    label: 'Duvel bottle',
    date: '2026-09-10',
    drinkIds: [42, 43],
    alcoholTypeId: 4,
    payload: PAYLOAD,
    undoUntil: 5000,
    error: null,
    seq: 1,
    createdAt: 1000,
  };

  it('produces one provisional row per id, using the label as the provisional name', () => {
    const rows = pendingInsertsForDate({ entries: [base] }, '2026-09-10');
    expect(rows).toEqual([
      { id: 42, name: 'Duvel bottle', alcoholTypeId: 4 },
      { id: 43, name: 'Duvel bottle', alcoholTypeId: 4 },
    ]);
  });

  it('excludes a different date', () => {
    expect(pendingInsertsForDate({ entries: [base] }, '2026-09-09')).toEqual([]);
  });

  it('excludes an undone save: the row was deleted again', () => {
    expect(pendingInsertsForDate({ entries: [{ ...base, status: 'undone' }] }, '2026-09-10')).toEqual([]);
  });

  it('excludes a failed save: no row was ever created', () => {
    expect(pendingInsertsForDate({ entries: [{ ...base, status: 'failed' }] }, '2026-09-10')).toEqual([]);
  });

  it('excludes delete-kind entries', () => {
    const del: SaveQueueEntry = {
      id: 'd1',
      kind: 'delete',
      status: 'undoable',
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [7],
      undoUntil: 5000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    expect(pendingInsertsForDate({ entries: [del] }, '2026-09-10')).toEqual([]);
  });
});

describe('suppressedIdsForDate', () => {
  const base: SaveQueueEntry = {
    id: 'd1',
    kind: 'delete',
    status: 'undoable',
    label: 'Heineken',
    date: '2026-09-10',
    drinkIds: [7, 8],
    undoUntil: 5000,
    error: null,
    seq: 1,
    createdAt: 1000,
  };

  it('suppresses the ids of an undoable delete', () => {
    expect(suppressedIdsForDate({ entries: [base] }, '2026-09-10')).toEqual(new Set([7, 8]));
  });

  it('keeps suppressing while the flush is in flight', () => {
    expect(suppressedIdsForDate({ entries: [{ ...base, status: 'saving' }] }, '2026-09-10')).toEqual(new Set([7, 8]));
  });

  it('keeps suppressing once committed: the DELETE has been sent', () => {
    expect(suppressedIdsForDate({ entries: [{ ...base, status: 'committed' }] }, '2026-09-10')).toEqual(new Set([7, 8]));
  });

  /** Fails safe: a flush that failed must not hide a row that was never actually deleted. */
  it('stops suppressing once undone', () => {
    expect(suppressedIdsForDate({ entries: [{ ...base, status: 'undone' }] }, '2026-09-10')).toEqual(new Set());
  });

  it('stops suppressing once failed', () => {
    expect(suppressedIdsForDate({ entries: [{ ...base, status: 'failed' }] }, '2026-09-10')).toEqual(new Set());
  });

  it('excludes a different date', () => {
    expect(suppressedIdsForDate({ entries: [base] }, '2026-09-09')).toEqual(new Set());
  });

  it('excludes save-kind entries', () => {
    const save: SaveQueueEntry = {
      id: 's1',
      kind: 'save',
      status: 'undoable',
      label: 'Duvel bottle',
      date: '2026-09-10',
      drinkIds: [42],
      alcoholTypeId: 4,
      payload: PAYLOAD,
      undoUntil: 5000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    expect(suppressedIdsForDate({ entries: [save] }, '2026-09-10')).toEqual(new Set());
  });
});

describe('isQueueIdle', () => {
  it('is true for an empty queue', () => {
    expect(isQueueIdle(EMPTY_QUEUE)).toBe(true);
  });

  it.each(['saving', 'undoable', 'undoing'] as const)('is false while an entry is %s', (status) => {
    const entry: SaveQueueEntry = {
      id: 'd1',
      kind: 'delete',
      status,
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [7],
      undoUntil: 5000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    expect(isQueueIdle({ entries: [entry] })).toBe(false);
  });

  it.each(['committed', 'undone', 'failed'] as const)('is true when every entry is %s', (status) => {
    const entry: SaveQueueEntry = {
      id: 'd1',
      kind: 'delete',
      status,
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [7],
      undoUntil: 5000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    expect(isQueueIdle({ entries: [entry] })).toBe(true);
  });
});

describe('reduce with an unrecognized action', () => {
  it('returns the queue unchanged', () => {
    const state: SaveQueueState = { entries: [] };
    // @ts-expect-error deliberately outside the action union, to exercise the default branch
    expect(reduce(state, { type: 'not-a-real-action' })).toBe(state);
  });
});

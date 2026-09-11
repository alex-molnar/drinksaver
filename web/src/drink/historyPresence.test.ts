import { describe, expect, it } from 'vitest';
import { EMPTY_HISTORY_PRESENCE, historyPresenceReducer as reduce, historyRows } from './historyPresence';

const drinks = [1, 2, 3, 4].map((id) => ({ id, name: `Drink ${id}`, alcoholTypeId: 4 }));
const [a, b, c, d] = drinks;
const order = [1, 2, 3, 4];
const start = (targets = [b], token = 1) => reduce(EMPTY_HISTORY_PRESENCE, { type: 'remove', drinks: targets, order, token });
const project = (live = [a, c, d], presence = start(), suppressed = new Set([2])) => historyRows(live, presence, suppressed, new Set([3]));

describe('History presence', () => {
  it('keeps a crossed-off middle row in its original slot with one key and a live count', () => {
    const rows = project();
    expect(rows.map((row) => row.drink.id)).toEqual(order);
    expect(rows.filter((row) => !row.gone)).toHaveLength(3);
    expect(rows[1]).toMatchObject({ gone: true, selected: false, token: 1 });
    expect(rows[2].selected).toBe(true);
  });

  it('does not animate records dropped by a refresh', () => {
    expect(project([a, c], EMPTY_HISTORY_PRESENCE, new Set()).map((row) => row.drink.id)).toEqual([1, 3]);
  });

  it('restores an undone row exactly once and ignores its old exit if a later refresh drops it', () => {
    expect(project(drinks, start(), new Set()).map((row) => row.gone)).toEqual([false, false, false, false]);
    expect(project([a, c, d], start(), new Set()).map((row) => row.drink.id)).toEqual([1, 3, 4]);
    // Live data wins even if a queue snapshot still includes the suppressed id.
    expect(project(drinks).filter((row) => row.drink.id === 2)).toHaveLength(1);
  });

  it('preserves bulk and overlapping exits as earlier rows finish, and appends new live rows', () => {
    const first = start([a, c]);
    const second = reduce(first, { type: 'remove', drinks: [b], order, token: 2 });
    const remaining = reduce(second, { type: 'finish', id: 1, token: 1 });
    const e = { id: 5, name: 'New drink', alcoholTypeId: 4 };
    expect(project([d, e], remaining, new Set([1, 2, 3])).map((row) => row.drink.id)).toEqual([2, 3, 4, 5]);
  });

  it('ignores stale completion callbacks after the same row is crossed off again', () => {
    const current = start([b], 2);
    expect(reduce(current, { type: 'finish', id: 2, token: 1 })).toBe(current);
    expect(reduce(current, { type: 'finish', id: 99, token: 2 })).toBe(current);
    expect(project([a, c, d], reduce(current, { type: 'finish', id: 2, token: 2 })).map((row) => row.drink.id)).toEqual([1, 3, 4]);
  });
});

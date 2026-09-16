import type { SavedRecommendation } from './savedRecommendations';
import type { RecommendationEdit } from '../types/api';

/** The arrangement Cancel returns to, and what `restore` puts back when a save is undone. */
export interface DraftSnapshot {
  readonly order: readonly number[];
  readonly names: ReadonlyMap<number, string>;
}

export interface RecommendationDraft {
  /**
   * Every known id, in the user's arrangement, **including ids hidden by a pending delete**.
   * Hiding is a filter applied at read time (`visibleRows`), never a splice, which is what lets
   * undoing a delete put a row back in its own slot with no bookkeeping at all.
   */
  readonly order: readonly number[];
  readonly names: ReadonlyMap<number, string>;
  readonly committed: DraftSnapshot;
  /** The row whose name is open for editing, or null. */
  readonly editingId: number | null;
  /** The text in the open editor. Never reaches `names` until `edit/commit`. */
  readonly editingValue: string;
}

export const EMPTY_DRAFT: RecommendationDraft = {
  order: [],
  names: new Map(),
  committed: { order: [], names: new Map() },
  editingId: null,
  editingValue: '',
};

export type RecommendationDraftAction =
  | { type: 'sync'; rows: readonly SavedRecommendation[] }
  | { type: 'edit/start'; id: number }
  | { type: 'edit/change'; value: string }
  | { type: 'edit/commit' }
  | { type: 'edit/cancel' }
  | { type: 'reorder'; visibleOrder: readonly number[] }
  | { type: 'cancel' }
  | { type: 'saved' }
  | { type: 'restore'; snapshot: DraftSnapshot };

const sameOrder = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const snapshotOf = (state: RecommendationDraft): DraftSnapshot => ({
  order: state.order,
  names: state.names,
});

export const visibleRows = (
  state: RecommendationDraft,
  hidden: ReadonlySet<number>,
): SavedRecommendation[] =>
  state.order
    .filter((id) => !hidden.has(id))
    .map((id) => ({ id, name: state.names.get(id) ?? '' }));

export const isDirty = (state: RecommendationDraft, hidden: ReadonlySet<number>): boolean => {
  const live = state.order.filter((id) => !hidden.has(id));
  const was = state.committed.order.filter((id) => !hidden.has(id));
  if (!sameOrder(live, was)) {
    return true;
  }
  return live.some((id) => state.names.get(id) !== state.committed.names.get(id));
};

/** D9: display order, deleted rows absent, the name always present. */
export const editPayload = (
  state: RecommendationDraft,
  hidden: ReadonlySet<number>,
): RecommendationEdit[] =>
  visibleRows(state, hidden).map((row) => ({ id: row.id, name: row.name }));

/**
 * Applies a new visible order without disturbing the slots hidden rows occupy. Walking the old
 * order and refilling only its visible positions is what keeps an undone delete landing back
 * between the same two neighbours it left.
 */
const applyVisibleOrder = (order: readonly number[], visibleOrder: readonly number[]): number[] => {
  const moving = new Set(visibleOrder);
  const queue = [...visibleOrder];
  return order.map((id) => (moving.has(id) ? queue.shift()! : id));
};

/**
 * Reconciles a server list with whatever the user has arranged. A refetch must never throw away
 * unsaved work (`['recommendations']` is shared with Quick Save, and `SaveQueueProvider`
 * refetches it whenever its own queue idles, entirely outside this page's control), so an
 * existing id keeps its slot and its local name, a new id is appended, and an id the server no
 * longer returns is dropped from both the draft and the baseline. A first sync, where there is
 * nothing to preserve, reduces to the server's own list.
 */
const sync = (
  state: RecommendationDraft,
  rows: readonly SavedRecommendation[],
): RecommendationDraft => {
  const serverNames = new Map(rows.map((row) => [row.id, row.name]));
  const known = new Set(state.order);
  const added = rows.filter((row) => !known.has(row.id)).map((row) => row.id);

  const order = [...state.order.filter((id) => serverNames.has(id)), ...added];
  const names = new Map(order.map((id) => [id, state.names.get(id) ?? serverNames.get(id)!]));

  const committedOrder = [...state.committed.order.filter((id) => serverNames.has(id)), ...added];
  const committedNames = new Map(
    committedOrder.map((id) => [id, state.committed.names.get(id) ?? serverNames.get(id)!]),
  );

  return { ...state, order, names, committed: { order: committedOrder, names: committedNames } };
};

export const recommendationDraftReducer = (
  state: RecommendationDraft,
  action: RecommendationDraftAction,
): RecommendationDraft => {
  switch (action.type) {
    case 'sync':
      return sync(state, action.rows);

    case 'edit/start':
      return { ...state, editingId: action.id, editingValue: state.names.get(action.id) ?? '' };

    case 'edit/change':
      return { ...state, editingValue: action.value };

    case 'edit/commit': {
      if (state.editingId === null) {
        return state;
      }
      const trimmed = state.editingValue.trim();
      // D8: an empty name reverts. A row that lost its label would be unidentifiable, and the
      // server has no way to give it back.
      if (trimmed === '') {
        return { ...state, editingId: null, editingValue: '' };
      }
      const names = new Map(state.names);
      names.set(state.editingId, trimmed);
      return { ...state, names, editingId: null, editingValue: '' };
    }

    case 'edit/cancel':
      return { ...state, editingId: null, editingValue: '' };

    case 'reorder':
      return { ...state, order: applyVisibleOrder(state.order, action.visibleOrder) };

    case 'cancel':
      return {
        ...state,
        order: state.committed.order,
        names: state.committed.names,
        editingId: null,
        editingValue: '',
      };

    case 'saved':
      return { ...state, committed: snapshotOf(state) };

    case 'restore':
      return {
        ...state,
        order: action.snapshot.order,
        names: action.snapshot.names,
        committed: action.snapshot,
        editingId: null,
        editingValue: '',
      };

    default:
      return state;
  }
};

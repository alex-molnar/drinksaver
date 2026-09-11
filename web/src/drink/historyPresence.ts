import type { EditableDrink } from '../types/api';
import type { PaperTabRow } from '../components/PaperTab';

export interface HistoryPresence {
  order: readonly number[];
  exits: ReadonlyMap<number, { drink: EditableDrink; token: number }>;
}

export const EMPTY_HISTORY_PRESENCE: HistoryPresence = { order: [], exits: new Map() };

export type HistoryPresenceAction =
  | { type: 'remove'; drinks: readonly EditableDrink[]; order: readonly number[]; token: number }
  | { type: 'finish'; id: number; token: number };

/** Only a cross-off event may retain a row. A query refresh or a date change never starts one. */
export function historyPresenceReducer(state: HistoryPresence, action: HistoryPresenceAction): HistoryPresence {
  const exits = new Map(state.exits);
  if (action.type === 'remove') {
    for (const drink of action.drinks) exits.set(drink.id, { drink, token: action.token });
    return { order: action.order, exits };
  }
  // An interrupted animation must not complete a newer delete of the same row.
  if (exits.get(action.id)?.token !== action.token) return state;
  exits.delete(action.id);
  return { order: state.order, exits };
}

export function historyRows(
  live: readonly EditableDrink[],
  presence: HistoryPresence,
  suppressed: ReadonlySet<number>,
  selected: ReadonlySet<number>,
): PaperTabRow[] {
  const rows = new Map(live.map((drink) => [drink.id, { drink, selected: selected.has(drink.id), gone: false } as PaperTabRow]));
  for (const [id, exit] of presence.exits) {
    // Live rows win immediately on Undo. The queue also cancels an exit if a delete fails.
    if (suppressed.has(id) && !rows.has(id)) rows.set(id, { ...exit, selected: false, gone: true });
  }
  if (![...rows.values()].some((row) => row.gone)) return [...rows.values()];
  const ordered: PaperTabRow[] = [];
  for (const id of presence.order) {
    const row = rows.get(id);
    if (row) ordered.push(row);
    rows.delete(id);
  }
  return [...ordered, ...rows.values()];
}

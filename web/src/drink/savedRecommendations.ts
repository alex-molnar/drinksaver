import type { Recommendation } from '../types/api';

/**
 * One editable row. Deliberately narrower than `Recommendation`: this page renames, reorders
 * and deletes, and never needs the drink composition behind a recommendation. Narrowing here
 * is what keeps the draft reducer comparable by value.
 */
export interface SavedRecommendation {
  readonly id: number;
  readonly name: string;
}

/**
 * The rows this page may edit. `GET /v1/recommendations/list` merges three sources
 * (`RecommendationService.getRecommendations`): persisted personal rows, rows derived from the
 * user's own drink history, and the admin defaults. Only the first kind carries an id, and only
 * the first kind belongs to the caller, so both conditions are load-bearing rather than one
 * implying the other. Server order is kept as-is: `findValidByUserId` already sorts persisted
 * rows by `orderNumber`.
 */
export const savedRecommendations = (
  all: readonly Recommendation[] | undefined,
  userId: string | undefined,
): SavedRecommendation[] => {
  if (!all || !userId) {
    return [];
  }
  return all
    .filter((rec) => rec.id != null && rec.userId === userId)
    .map((rec) => ({ id: rec.id, name: rec.name }));
};

import { describe, expect, it } from 'vitest';
import { savedRecommendations } from './savedRecommendations';
import type { Recommendation } from '../types/api';

const ME = '423c91e4-491f-4f82-aba6-3c982857e0e4';
const ADMIN = '00000000-0000-0000-0000-000000000001';

/** `GET /v1/recommendations/list` merges three sources into one array. Only the persisted
 *  personal rows carry an id, and an id is what PATCH and DELETE address. */
const row = (over: Partial<Recommendation>): Recommendation => ({
  id: 1,
  userId: ME,
  name: 'Gin & Tonic',
  alcoholTypeId: 1,
  alcoholVolumeId: 2,
  ...over,
} as Recommendation);

describe('savedRecommendations', () => {
  it("keeps this user's persisted rows, in the order the server sent them", () => {
    const result = savedRecommendations(
      [row({ id: 7, name: 'HJ pint' }), row({ id: 3, name: 'Office Chouffe' })],
      ME,
    );

    expect(result).toEqual([
      { id: 7, name: 'HJ pint' },
      { id: 3, name: 'Office Chouffe' },
    ]);
  });

  it('drops history-derived rows, which carry no id to address', () => {
    const derived = { ...row({ name: 'Whisky' }), id: undefined } as unknown as Recommendation;

    expect(savedRecommendations([derived], ME)).toEqual([]);
  });

  it('drops the admin default rows, which belong to another user', () => {
    expect(savedRecommendations([row({ id: 9, userId: ADMIN })], ME)).toEqual([]);
  });

  it('returns nothing while the user id is still unknown, rather than everything', () => {
    expect(savedRecommendations([row({ id: 4 })], undefined)).toEqual([]);
  });

  it('returns nothing while the query has not resolved', () => {
    expect(savedRecommendations(undefined, ME)).toEqual([]);
  });
});

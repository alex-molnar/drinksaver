import { describe, expect, it } from 'vitest';
import { keys, hasValidParentId } from './queries';

describe('admin query keys', () => {
  it('keeps child caches separate for each parent and source', () => {
    expect(keys.subtypes(2)).not.toEqual(keys.subtypes(3));
    expect(keys.userSubtypes(2)).not.toEqual(keys.subtypes(2));
    expect(keys.flavours(2)).not.toEqual(keys.userFlavours(2));
  });

  it('enables parent queries only for positive safe integer IDs', () => {
    expect(hasValidParentId(1)).toBe(true);
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expect(hasValidParentId(id)).toBe(false);
    }
  });
});

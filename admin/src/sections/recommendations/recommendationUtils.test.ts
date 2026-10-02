import { describe, expect, it } from 'vitest';
import { renamePayload } from './recommendationUtils';

describe('renamePayload', () => {
  it('keeps every row in order and changes only the selected name', () => {
    expect(renamePayload([{ id: 7, name: 'Beer' }, { id: 3, name: 'Wine' }], 3, 'Red'))
      .toEqual([{ id: 7, name: 'Beer' }, { id: 3, name: 'Red' }]);
  });
});

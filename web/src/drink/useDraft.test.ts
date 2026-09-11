import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDraft } from './useDraft';

describe('useDraft', () => {
  it('throws when used outside a DraftProvider', () => {
    expect(() => renderHook(() => useDraft())).toThrow('useDraft must be used within a DraftProvider');
  });
});

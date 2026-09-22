import { describe, expect, it } from 'vitest';
import { isAdmin } from './adminGroup';

describe('isAdmin', () => {
  it('accepts a bare group name', () => {
    expect(isAdmin(['admin'])).toBe(true);
  });

  it('accepts a full path, which is what the mapper emits by default', () => {
    expect(isAdmin(['/admin'])).toBe(true);
  });

  it('accepts a nested path whose last segment is admin', () => {
    expect(isAdmin(['/drinksaver/admin'])).toBe(true);
  });

  it('rejects a group that merely contains admin', () => {
    expect(isAdmin(['/administrators'])).toBe(false);
    expect(isAdmin(['not-admin'])).toBe(false);
  });

  it('rejects an absent or malformed claim rather than throwing', () => {
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin('admin')).toBe(false);
    expect(isAdmin([])).toBe(false);
    expect(isAdmin([42, null])).toBe(false);
  });
});
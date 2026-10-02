import { describe, expect, it } from 'vitest';
import { isAdmin } from './adminGroup';

describe('isAdmin', () => {
  it('accepts exactly the full admin path', () => {
    expect(isAdmin(['/admin'])).toBe(true);
  });

  it('rejects bare, nested and similarly named groups', () => {
    expect(isAdmin(['admin'])).toBe(false);
    expect(isAdmin(['/drinksaver/admin'])).toBe(false);
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

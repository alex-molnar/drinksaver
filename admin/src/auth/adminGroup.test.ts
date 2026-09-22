import { describe, expect, it } from 'vitest';
import { ADMIN_GROUP, isAdmin } from './adminGroup';

describe('isAdmin', () => {
  it('exports the canonical group name', () => expect(ADMIN_GROUP).toBe('admin'));

  it.each([
    ['bare group', ['admin']],
    ['full path', ['/admin']],
    ['nested path', ['/parent/admin']],
    ['one matching entry', ['/user', '/admin']],
  ])('accepts %s', (_name, groups) => expect(isAdmin(groups)).toBe(true));

  it.each([undefined, null, 'admin', {}, ['administrators'], ['/admin-team'], [1], [null]])(
    'rejects malformed or non-admin claims: %s',
    (groups) => expect(isAdmin(groups)).toBe(false),
  );
});

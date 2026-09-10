import { describe, expect, it } from 'vitest';
import { DRINK_IDENTITIES, drinkIdentity } from './identity';

describe('drinkIdentity', () => {
  it.each(Object.keys(DRINK_IDENTITIES))('resolves "%s" to its table entry', (name) => {
    expect(drinkIdentity(name)).toBe(DRINK_IDENTITIES[name]);
  });

  it('falls back to a default identity for a name not in the table', () => {
    expect(DRINK_IDENTITIES['Nonexistent Drink']).toBeUndefined();
    expect(drinkIdentity('Nonexistent Drink').glass).toBe('highball');
  });

  it('the default identity does not reuse a table entry\'s field colour', () => {
    const fallback = drinkIdentity('Nonexistent Drink');
    for (const identity of Object.values(DRINK_IDENTITIES)) {
      expect(fallback.field).not.toBe(identity.field);
    }
  });

  // The old name-keyword fallback chain matched loosely on purpose. This table deliberately
  // does not: a near miss on a drink's exact display name falls all the way through to the
  // default rather than guessing, which is the behaviour change that lets the chain be deleted.
  it('matches the exact display name only, so a near miss falls back to the default', () => {
    expect(drinkIdentity('heineken pint').glass).toBe('highball');
    expect(drinkIdentity('Heineken').glass).toBe('highball');
  });
});

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

/**
 * The rung that keeps the History screen honest. Names there are composed server side, so they
 * never match the table, and a name-only lookup drew a highball for every drink ever saved.
 */
describe('falling back to the alcohol type id', () => {
  it('draws a pint for a beer whose composed name is nothing like the table', () => {
    expect(drinkIdentity('Heineken Original (Draft/Tap - 0.50l)', 4).glass).toBe('pint');
  });

  it('draws a wine glass for a wine type id', () => {
    expect(drinkIdentity('Red (Large glass - 0.30l)', 30).glass).toBe('wine');
  });

  it('draws a highball for a spirit type id', () => {
    expect(drinkIdentity('Gin (Long drink - 0.25l)', 6).glass).toBe('highball');
  });

  it('prefers the exact name over the id when both are known', () => {
    // 6 is a spirit, but the name is in the table and carries the richer identity.
    const byName = drinkIdentity('Heineken pint', 6);
    expect(byName.glass).toBe('palinka');
    expect(byName.field).toBe('#2B7454');
  });

  it('falls through to the default for an id this deployment does not define', () => {
    expect(drinkIdentity('Something unheard of', 9999).glass).toBe('highball');
    expect(drinkIdentity('Something unheard of', 9999).field).toBe('#2E1C17');
  });

  it('falls through to the default when no id is given at all', () => {
    expect(drinkIdentity('Something unheard of').glass).toBe('highball');
  });
});

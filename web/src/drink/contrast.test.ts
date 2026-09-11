import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast';
import { DRINK_IDENTITIES, drinkIdentity } from './identity';

// Known values first, so a bug in the maths cannot make the gate below pass vacuously: if
// black-on-white were not 21:1, or a colour against itself were not 1:1, nothing computed from
// the same formula could be trusted either.
describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('is 1 for white', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10);
  });
});

describe('relativeLuminance validation', () => {
  it('rejects anything that is not a 6-digit hex colour', () => {
    expect(() => relativeLuminance('not-a-colour')).toThrow(/hex colour/);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 6);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#2B7454', '#2B7454')).toBe(1);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#000000'), 10);
  });
});

// This is the gate the design doc describes: it is what caught two failing colours during
// design (Heineken's green and Chouffe's red both measured under 4.5:1 before they moved 2.4%
// darker), and it is what keeps this table correct rather than merely intended. A new drink is
// added to `identity.ts` only once this passes for it too.
describe('the drink identity table clears WCAG AA', () => {
  it.each(Object.entries(DRINK_IDENTITIES))('%s: field/inkDark >= 4.5:1', (_name, identity) => {
    expect(contrastRatio(identity.field, identity.inkDark)).toBeGreaterThanOrEqual(4.5);
  });

  it('the fallback identity for an unrecognised drink also clears it', () => {
    const fallback = drinkIdentity('a drink this table has never heard of');
    expect(contrastRatio(fallback.field, fallback.inkDark)).toBeGreaterThanOrEqual(4.5);
  });
});

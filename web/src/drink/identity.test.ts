import { describe, expect, it } from 'vitest';
import { DRINK_IDENTITY_SPECS, drinkIdentity } from './identity';
import { TEST_DESIGN, TEST_PALETTE_BY_NAME } from '../test/designFixtures';

describe('drinkIdentity', () => {
  it.each(Object.entries(DRINK_IDENTITY_SPECS))(
    'resolves "%s" through the backend catalogue names',
    (name, spec) => {
      const identity = drinkIdentity(name, undefined, TEST_DESIGN);
      expect(identity.field).toBe(TEST_PALETTE_BY_NAME[spec.palette].field);
      expect(identity.glassware.name).toBe(spec.glassware);
    },
  );

  it('falls back to neutral endpoint-independent definitions for an unknown drink', () => {
    const identity = drinkIdentity('Nonexistent Drink', undefined, TEST_DESIGN);
    expect(identity.field).toBe('#2E1C17');
    expect(identity.glassware.name).toBe('highball');
  });

  it('matches exact display names only', () => {
    expect(drinkIdentity('heineken pint', undefined, TEST_DESIGN).glassware.name).toBe('highball');
    expect(drinkIdentity('Heineken', undefined, TEST_DESIGN).glassware.name).toBe('highball');
  });
});

describe('history alcohol type fallback', () => {
  it('draws a pint for a beer whose composed name is unrecognised', () => {
    expect(
      drinkIdentity('Heineken Original (Draft/Tap - 0.50l)', 4, TEST_DESIGN).glassware.name,
    ).toBe('pint');
  });

  it('draws a wine glass for a wine type id', () => {
    expect(drinkIdentity('Red (Large glass - 0.30l)', 30, TEST_DESIGN).glassware.name).toBe('wine');
  });

  it('draws a highball for a spirit type id', () => {
    expect(drinkIdentity('Gin (Long drink - 0.25l)', 6, TEST_DESIGN).glassware.name).toBe('highball');
  });

  it('prefers the exact name over the alcohol type id', () => {
    const byName = drinkIdentity('Heineken pint', 6, TEST_DESIGN);
    expect(byName.glassware.name).toBe('palinka');
    expect(byName.field).toBe(TEST_PALETTE_BY_NAME.green.field);
  });

  it('falls through to the neutral definitions for an unknown id', () => {
    const identity = drinkIdentity('Something unheard of', 9999, TEST_DESIGN);
    expect(identity.glassware.name).toBe('highball');
    expect(identity.field).toBe('#2E1C17');
  });
});

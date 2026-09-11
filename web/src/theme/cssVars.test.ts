import { describe, it, expect } from 'vitest';
import { applyCssVars, toCssVars } from './cssVars';
import { darkTokens } from './tokens';

/**
 * Re-derives the `--ds-*` names `toCssVars` should produce, independently of its
 * implementation, so this test checks behaviour rather than re-running the same logic on
 * itself. `ThemeTokens` nests at most three levels deep (for example `type.displayL.fontSize`),
 * so walking every field recursively is the only way to assert nothing is missing.
 */
const kebab = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const expectedEntries = (value: unknown, prefix: string, out: Record<string, string>): void => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      expectedEntries(child, `${prefix}-${kebab(key)}`, out);
    }
    return;
  }
  out[prefix] = String(value);
};

describe('toCssVars', () => {
  it('emits a custom property for every field of ThemeTokens', () => {
    const result = toCssVars(darkTokens);

    const expected: Record<string, string> = {};
    for (const [category, value] of Object.entries(darkTokens)) {
      expectedEntries(value, `--ds-${kebab(category)}`, expected);
    }

    // Same set of names...
    expect(Object.keys(result).sort()).toEqual(Object.keys(expected).sort());
    // ...with the same values, so a name matching by coincidence is not enough to pass.
    for (const [name, value] of Object.entries(expected)) {
      expect(result[name]).toBe(value);
    }
  });

  it('renders the umber ground as --ds-surface-ground, verbatim from the design doc', () => {
    const result = toCssVars(darkTokens);
    expect(result['--ds-surface-ground']).toBe('#231512');
  });
});

describe('applyCssVars', () => {
  it('sets every custom property from toCssVars on the given element', () => {
    const el = document.createElement('div');
    applyCssVars(el, darkTokens);

    for (const [name, value] of Object.entries(toCssVars(darkTokens))) {
      expect(el.style.getPropertyValue(name)).toBe(value);
    }
  });

  it('sets nothing beyond those custom properties', () => {
    const el = document.createElement('div');
    applyCssVars(el, darkTokens);
    expect(el.style.length).toBe(Object.keys(toCssVars(darkTokens)).length);
  });
});

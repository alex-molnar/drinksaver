import { describe, it, expect } from 'vitest';
import { muiTheme } from './muiTheme';
import { darkTokens } from './tokens';

describe('muiTheme', () => {
  it('is a dark theme', () => {
    expect(muiTheme.palette.mode).toBe('dark');
  });

  /**
   * The palette reads `darkTokens` directly rather than a `var(--ds-*)` string. MUI's own
   * components run colour maths - `alpha()`, `decomposeColor()` - on `theme.palette.*.main`
   * internally (an `IconButton`'s hover overlay, for one), and that code cannot parse a custom
   * property reference; it throws the moment such a component renders. `styleOverrides` is a
   * plain CSS property MUI never touches that way, which is why `muiTheme.ts`'s `v()` helper is
   * used there and nowhere in the palette.
   */
  it('reads its background and text from the surface and ink tokens directly', () => {
    expect(muiTheme.palette.background?.default).toBe(darkTokens.surface.ground);
    expect(muiTheme.palette.background?.paper).toBe(darkTokens.surface.panel);
    expect(muiTheme.palette.text.primary).toBe(darkTokens.ink.primary);
    expect(muiTheme.palette.text.secondary).toBe(darkTokens.ink.secondary);
  });

  it('reads its base typeface from the body type role', () => {
    expect(muiTheme.typography.fontFamily).toBe(darkTokens.type.body.fontFamily);
  });

  /**
   * `primary` and `error` are different MUI roles, but the design doc assigns `--red` to both
   * "Primary action" and "destructive marks", and `tokens.test.ts` separately asserts
   * `accent.primary` and `accent.danger` share a value. This checks the theme wires each role to
   * its matching token rather than to the other one.
   */
  it('wires primary to accent.primary and error to accent.danger', () => {
    expect(muiTheme.palette.primary.main).toBe(darkTokens.accent.primary);
    expect(muiTheme.palette.error.main).toBe(darkTokens.accent.danger);
  });

  it('gives every custom palette colour an explicit light, dark and contrastText, never MUI-derived', () => {
    for (const key of ['primary', 'secondary', 'error'] as const) {
      const color = muiTheme.palette[key];
      expect(color.light).toBe(color.main);
      expect(color.dark).toBe(color.main);
      expect(color.contrastText).toBe(darkTokens.ink.primary);
    }
  });

  /**
   * Every styleOverrides entry must be a plain object. A callback is equally valid MUI API, but
   * MUI only invokes it once a matching component renders, and nothing here renders one; left
   * as a callback, the function body would sit uncovered against a coverage gate that has
   * almost no slack.
   */
  it('writes every styleOverrides block as a plain object, never a callback', () => {
    const components = muiTheme.components ?? {};
    let checked = 0;
    for (const [name, config] of Object.entries(components)) {
      const overrides = (config as { styleOverrides?: Record<string, unknown> }).styleOverrides;
      if (overrides === undefined) continue;
      for (const [slot, style] of Object.entries(overrides)) {
        expect(typeof style, `${name}.styleOverrides.${slot}`).not.toBe('function');
        checked += 1;
      }
    }
    // Guards against the test silently checking nothing if `components` is ever emptied out.
    expect(checked).toBeGreaterThan(0);
  });

  /** A spot check that styleOverrides values do reference the live custom properties. */
  it('reads its component overrides from var(--ds-*)', () => {
    const button = muiTheme.components?.MuiButton?.styleOverrides as { root?: { borderRadius?: string } };
    expect(button.root?.borderRadius).toBe('var(--ds-radius-md)');
  });
});

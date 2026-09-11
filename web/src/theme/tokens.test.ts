import { describe, it, expect } from 'vitest';
import { darkTokens } from './tokens';

describe('darkTokens', () => {
  it('covers every ThemeTokens category', () => {
    expect(Object.keys(darkTokens).sort()).toEqual(
      ['accent', 'elevation', 'ink', 'line', 'motion', 'radius', 'space', 'surface', 'texture', 'type'].sort(),
    );
  });

  it('matches the design doc colour tokens verbatim', () => {
    expect(darkTokens.surface.ground).toBe('#231512');
    expect(darkTokens.surface.raised).toBe('#2A1A15');
    expect(darkTokens.surface.panel).toBe('#2E1C17');
    expect(darkTokens.surface.recess).toBe('#1B0F0D');
    expect(darkTokens.surface.paper).toBe('#EBDCC0');
    expect(darkTokens.ink.primary).toBe('#F2E4CE');
    expect(darkTokens.ink.secondary).toBe('rgba(242,228,206,.70)');
    expect(darkTokens.ink.tertiary).toBe('rgba(242,228,206,.52)');
    expect(darkTokens.ink.onPaper).toBe('#2B1A14');
    expect(darkTokens.line.hairline).toBe('rgba(242,228,206,.14)');
    expect(darkTokens.accent.active).toBe('#C8952B');
    expect(darkTokens.accent.danger).toBe('#C4462E');
  });

  /** The design doc assigns `--red` to both "Primary action" and "destructive marks". */
  it('gives accent.primary and accent.danger the same hue', () => {
    expect(darkTokens.accent.primary).toBe(darkTokens.accent.danger);
  });

  it('matches the design doc type roles verbatim', () => {
    expect(darkTokens.type.displayL).toMatchObject({ fontSize: '27px', fontWeight: 700 });
    expect(darkTokens.type.displayM).toMatchObject({ fontSize: '20px', fontWeight: 700 });
    expect(darkTokens.type.displayS).toMatchObject({ fontSize: '18px', fontWeight: 600 });
    expect(darkTokens.type.numeral).toMatchObject({
      fontSize: '48px',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    });
    expect(darkTokens.type.body).toMatchObject({ fontSize: '15px', fontWeight: 400 });
    expect(darkTokens.type.caption).toMatchObject({ fontSize: '11.5px', fontWeight: 500 });
  });

  /**
   * Each Fraunces display role ships as its own static font instance (see the comment above
   * `fraunces` in `tokens.ts`), so nothing but the family name distinguishes them at the CSS
   * layer. A collision here would mean two roles silently rendering identically.
   */
  it('gives every Fraunces role a distinct font-family', () => {
    const families = [
      darkTokens.type.displayL.fontFamily,
      darkTokens.type.displayM.fontFamily,
      darkTokens.type.displayS.fontFamily,
      darkTokens.type.numeral.fontFamily,
    ];
    expect(new Set(families).size).toBe(families.length);
  });

  /** Familjen Grotesk stays one genuinely variable font: only wght differs across its two roles. */
  it('gives body and caption the same font-family', () => {
    expect(darkTokens.type.body.fontFamily).toBe(darkTokens.type.caption.fontFamily);
  });
});

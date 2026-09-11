/**
 * WCAG 2.2 contrast maths: relative luminance and contrast ratio, using the exact sRGB
 * linearisation the spec defines rather than an approximation (a flat gamma of 2.2, say).
 *
 * This exists so `identity.ts`'s field/ink pairs can be gated by a real number instead of by
 * eye. Two of the six drinks in that table moved 2.4% darker during design because this exact
 * maths, not an approximation, measured them under 4.5:1.
 *
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

/** `#rrggbb` to its three 0-255 channel values. Case insensitive; the `#` is required. */
const channelsOf = (hex: string): [number, number, number] => {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    throw new Error(`Not a 6-digit hex colour: ${hex}`);
  }
  const digits = match[1];
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
};

/** One sRGB channel (0-255), linearised per the WCAG 2.2 definition of relative luminance. */
const linearise = (channel8: number): number => {
  const c = channel8 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.2 relative luminance of a `#rrggbb` colour: 0 for black, 1 for white. */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = channelsOf(hex).map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * WCAG 2.2 contrast ratio between two `#rrggbb` colours, from 1 (identical) to 21 (black
 * against white). Argument order never matters: the lighter of the two always ends up on top
 * of the ratio, per the spec's own definition.
 */
export const contrastRatio = (a: string, b: string): number => {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

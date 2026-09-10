import type { ThemeTokens } from './tokens';

/** A flat map of CSS custom property names, e.g. `--ds-surface-ground`, to their values. */
export type CssVarMap = Record<string, string>;

/** `displayL` becomes `display-l`, `onPaper` becomes `on-paper`. */
const kebabCase = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Walks a token value recursively, appending one more kebab-cased path segment per level, and
 * writes a leaf into `out` once the value is no longer a plain object. `ThemeTokens` never
 * actually holds an array, but a recursive walk over data this function does not own should not
 * assume that forever, so arrays fall through to the leaf case rather than being spread.
 */
const flatten = (value: unknown, prefix: string, out: CssVarMap): void => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, `${prefix}-${kebabCase(key)}`, out);
    }
    return;
  }
  out[prefix] = String(value);
};

/**
 * Flattens every field of `tokens` into a `--ds-*` custom property. Pure and DOM free, so it is
 * trivially testable and safe to call anywhere, including a test that never mounts a document.
 * `applyCssVars` is the only place this shape meets the DOM.
 */
export const toCssVars = (tokens: ThemeTokens): CssVarMap => {
  const out: CssVarMap = {};
  for (const [category, value] of Object.entries(tokens)) {
    flatten(value, `--ds-${kebabCase(category)}`, out);
  }
  return out;
};

/**
 * Sets every custom property from `tokens` on `el`. Called once, in `main.tsx`, against the
 * document root, before the app renders, so every component that reads `var(--ds-*)` in this
 * same paint already has a value rather than a momentary fallback.
 */
export const applyCssVars = (el: HTMLElement, tokens: ThemeTokens): void => {
  for (const [name, value] of Object.entries(toCssVars(tokens))) {
    el.style.setProperty(name, value);
  }
};

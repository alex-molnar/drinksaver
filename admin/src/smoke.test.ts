import { describe, expect, it } from 'vitest';

describe('admin toolchain', () => {
  it('runs a test in jsdom with a DOM available', () => {
    const element = document.createElement('div');
    element.textContent = 'DrinkSaver Admin';
    expect(element.textContent).toBe('DrinkSaver Admin');
  });
});
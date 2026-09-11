import { describe, expect, it } from 'vitest';
import { classifyError } from './errors';

describe('classifyError', () => {
  it('classifies a ChunkLoadError by name as a chunk failure', () => {
    const error = new Error('any message');
    error.name = 'ChunkLoadError';

    expect(classifyError(error)).toBe('chunk');
  });

  it('classifies a rejected dynamic import message as a chunk failure', () => {
    const error = new Error('Failed to fetch dynamically imported module: /assets/DetailedPage-abc123.js');

    expect(classifyError(error)).toBe('chunk');
  });

  it("classifies Safari's module script wording as a chunk failure", () => {
    const error = new Error('Importing a module script failed.');

    expect(classifyError(error)).toBe('chunk');
  });

  it('classifies an ordinary error as other', () => {
    const error = new Error('Cannot read properties of undefined');

    expect(classifyError(error)).toBe('other');
  });

  it('classifies a thrown non-Error value as other', () => {
    expect(classifyError('a string was thrown')).toBe('other');
  });
});

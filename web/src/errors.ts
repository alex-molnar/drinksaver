/**
 * Pure error classification for the lazy route boundary in
 * components/AppErrorBoundary.tsx. Kept free of React so it can be unit
 * tested on its own.
 *
 * A chunk load failure happens when a lazy route's dynamic import rejects.
 * Chunk filenames are content hashed, so a tab left open across a deploy asks
 * for a file that no longer exists. Bundlers name that error ChunkLoadError,
 * but browsers do not agree on the name, so the message is checked too:
 * Chrome and Firefox reject with a message containing "dynamically imported
 * module", Safari with "Importing a module script failed."
 */
export type ErrorKind = 'chunk' | 'other';

const CHUNK_ERROR_MESSAGE = /dynamically imported module|Importing a module script failed/i;

export const classifyError = (error: unknown): ErrorKind => {
  if (!(error instanceof Error)) {
    return 'other';
  }
  if (error.name === 'ChunkLoadError') {
    return 'chunk';
  }
  if (CHUNK_ERROR_MESSAGE.test(error.message)) {
    return 'chunk';
  }
  return 'other';
};

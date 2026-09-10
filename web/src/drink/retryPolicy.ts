/**
 * Classifies a failed save so the queue can decide how to respond. Pure, and free of React and
 * of the API client, so it is testable against plain fixtures.
 *
 * The axios client already has a 10s timeout (`api/client.ts`), and a timed-out POST may have
 * completed on the server anyway: an `ECONNABORTED` is exactly the case a naive retry would
 * double-log a drink, on bar wifi, which is exactly where it happens. That is why `timeout` is
 * its own classification rather than falling into `offline`: the provider's retry handler treats
 * it differently, refetching the day first and re-POSTing only if the row count did not rise.
 *
 * A 401 is not classified specially here: `api/client.ts`'s response interceptor already retries
 * it once after a token refresh, or logs the user out if that fails, so by the time an error
 * reaches this module a 401 is just an ordinary 4xx that already had its one shot at recovery.
 */
export type RetryClassification = 'timeout' | 'offline' | 'client' | 'server' | 'unknown';

interface AxiosLikeError {
  readonly isAxiosError: true;
  readonly code?: string;
  readonly response?: { readonly status: number };
}

const isAxiosError = (error: unknown): error is AxiosLikeError =>
  typeof error === 'object' && error !== null && (error as { isAxiosError?: unknown }).isAxiosError === true;

export const classify = (error: unknown): RetryClassification => {
  if (!isAxiosError(error)) {
    return 'unknown';
  }
  if (error.code === 'ECONNABORTED') {
    return 'timeout';
  }
  if (!error.response) {
    return 'offline';
  }
  const { status } = error.response;
  if (status >= 400 && status < 500) {
    return 'client';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'unknown';
};

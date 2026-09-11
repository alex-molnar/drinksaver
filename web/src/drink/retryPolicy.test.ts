import { describe, it, expect } from 'vitest';
import { classify } from './retryPolicy';

const axiosError = (fields: Record<string, unknown>) => ({ isAxiosError: true, ...fields });

describe('classify', () => {
  it('is timeout for an aborted connection', () => {
    expect(classify(axiosError({ code: 'ECONNABORTED' }))).toBe('timeout');
  });

  it('is offline when there is no response at all', () => {
    expect(classify(axiosError({ code: 'ERR_NETWORK' }))).toBe('offline');
  });

  it('is client for a 4xx response', () => {
    expect(classify(axiosError({ response: { status: 404 } }))).toBe('client');
    expect(classify(axiosError({ response: { status: 400 } }))).toBe('client');
    expect(classify(axiosError({ response: { status: 499 } }))).toBe('client');
  });

  it('is server for a 5xx response', () => {
    expect(classify(axiosError({ response: { status: 500 } }))).toBe('server');
    expect(classify(axiosError({ response: { status: 503 } }))).toBe('server');
  });

  it('is unknown for a status outside both ranges', () => {
    expect(classify(axiosError({ response: { status: 200 } }))).toBe('unknown');
  });

  it('is unknown for something that is not an axios error at all', () => {
    expect(classify(new Error('boom'))).toBe('unknown');
    expect(classify('boom')).toBe('unknown');
    expect(classify(null)).toBe('unknown');
    expect(classify(undefined)).toBe('unknown');
  });

  /** ECONNABORTED is checked before the response check, since a timeout also has no response. */
  it('prefers timeout over offline when both could apply', () => {
    expect(classify(axiosError({ code: 'ECONNABORTED', response: undefined }))).toBe('timeout');
  });
});

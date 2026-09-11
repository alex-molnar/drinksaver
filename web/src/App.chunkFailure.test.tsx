import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/test-utils';
import * as endpoints from './api/endpoints';
import App from './App';

/**
 * FIX-3's acceptance criterion, in its own file on purpose.
 *
 * The criterion is that a lazy import which rejects shows the fallback rather than an empty
 * tree, so one route module has to fail to import. Doing that inside App.test.tsx would mean
 * vi.resetModules() and re-importing App mid-file, which fights that file's own route table
 * cases and depends on test ordering. A hoisted mock in a separate file needs neither.
 *
 * What this asserts, and what it deliberately does not. It asserts the user-facing guarantee:
 * a route whose chunk will not load leaves a readable screen with a way out, instead of React
 * unmounting the tree and leaving nothing. It does not assert which of the two fallbacks
 * appears, because vitest wraps a failing mock factory in an error of its own and the browser
 * wording never survives. Reproducing Chrome's exact rejection message here would be testing
 * vitest. The classification of the real wording, from Chrome, Firefox and Safari, is covered
 * directly in errors.test.ts and AppErrorBoundary.test.tsx.
 */
vi.mock('./auth', () => ({
  KeycloakProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isLoading: false, isAuthenticated: true, logout: vi.fn() }),
}));

vi.mock('./api/endpoints');

vi.mock('./pages/QuickSavePage', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/QuickSavePage-a1b2c3.js');
});

beforeEach(() => {
  // React logs every error a boundary catches. Silencing it keeps the output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(endpoints.getRecommendations).mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a lazy route whose chunk will not load', () => {
  it('shows a fallback with a way out rather than an empty tree', async () => {
    const { container } = renderWithProviders(<App />, { route: '/' });

    // The way out. Both fallbacks offer a reload, which is what actually fixes a chunk that
    // went missing in a deploy.
    expect(await screen.findByRole('button', { name: /reload/i })).toBeInTheDocument();

    // The failure this guards against is an unmounted tree, so assert there is something left.
    expect(container).not.toBeEmptyDOMElement();
    // Either fallback's message, but not the button's own label.
    expect(screen.getByText(/was updated|went wrong/i)).toBeInTheDocument();
  });
});

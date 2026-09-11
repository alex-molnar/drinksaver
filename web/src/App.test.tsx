import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/test-utils';
import * as endpoints from './api/endpoints';
import App from './App';
import { isTonight } from './drink/day';

/**
 * The routing table had no test at all, which mattered once the routes became lazy:
 * a wrong path or a typo in a dynamic import is a runtime failure on navigation, not
 * a compile error, and the page would simply never arrive.
 *
 * The auth wrappers are replaced with pass-throughs. KeycloakProvider would otherwise
 * call keycloak.init and ProtectedRoute would render its spinner forever; neither is
 * what this file is about, and both are covered by their own tests.
 */
vi.mock('./auth', () => ({
  KeycloakProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // Layout, which every page renders, reads logout from here.
  useAuth: () => ({ isLoading: false, isAuthenticated: true, logout: vi.fn() }),
}));

vi.mock('./api/endpoints');

const HOME_HEADING = () => (isTonight(new Date()) ? 'Tonight' : 'Today');

beforeEach(() => {
  vi.mocked(endpoints.getRecommendations).mockResolvedValue([]);
  vi.mocked(endpoints.getAlcoholTypes).mockResolvedValue([]);
  vi.mocked(endpoints.getVolumesByAlcoholType).mockResolvedValue([]);
  vi.mocked(endpoints.getSubtypesByAlcoholType).mockResolvedValue([]);
  vi.mocked(endpoints.getConsumptionTypes).mockResolvedValue([]);
  vi.mocked(endpoints.getBrands).mockResolvedValue([]);
  vi.mocked(endpoints.getBeerFlavours).mockResolvedValue([]);
  vi.mocked(endpoints.getSavedDrinksByDate).mockResolvedValue([]);
});

describe('App', () => {
  it('loads the Quick Save screen at /', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: HOME_HEADING() })).toBeInTheDocument();
  });

  it('loads the History screen at /history', async () => {
    renderWithProviders(<App />, { route: '/history' });
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  /**
   * `/detailed` no longer has a page of its own: it redirects to the Quick Save screen with the
   * add sheet already open, so a bookmark or a link from an old session still lands somewhere
   * useful instead of a blank page.
   *
   * The Quick Save heading behind the sheet is deliberately not asserted here: once the sheet's
   * Drawer is open, MUI's `ModalManager` marks the rest of the page `aria-hidden`, so `findByRole`
   * correctly cannot see it any more than a screen reader could. That is the sheet behaving
   * correctly, not a gap in this test - see `SheetPortalContext.ts`'s module doc.
   */
  it('redirects /detailed to the Quick Save screen with the add sheet open', async () => {
    renderWithProviders(<App />, { route: '/detailed' });
    expect(await screen.findByRole('heading', { name: 'What are you having?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * One case per retired route, so every one of them is actually exercised rather than assumed.
   * `/success`, `/error` and the five `/new-*` routes carry no state that matters any more - their
   * pages are gone - so, unlike `/detailed`, landing at `/` plainly is the whole story.
   */
  it.each([['/success'], ['/error'], ['/new-alcohol'], ['/new-volume'], ['/new-brand'], ['/new-subtype'], ['/new-beer-flavour']])(
    'redirects %s to the Quick Save screen',
    async (route) => {
      renderWithProviders(<App />, { route });
      expect(await screen.findByRole('heading', { name: HOME_HEADING() })).toBeInTheDocument();
    }
  );

  it('redirects an unknown path to the Quick Save screen rather than leaving a blank page', async () => {
    renderWithProviders(<App />, { route: '/this-page-does-not-exist' });
    expect(await screen.findByRole('heading', { name: HOME_HEADING() })).toBeInTheDocument();
  });
});

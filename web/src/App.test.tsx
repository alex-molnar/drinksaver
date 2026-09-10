import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/test-utils';
import * as endpoints from './api/endpoints';
import App from './App';

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
  /**
   * One case per route, so every lazy() factory is actually executed. The state
   * payloads are the ones the real navigation helpers send; the three "new entry"
   * pages render an error card without them and would pass for the wrong reason.
   */
  it.each([
    ['/', 'Today', undefined],
    ['/detailed', 'Add Drink', undefined],
    ['/history', 'History', undefined],
    ['/success', 'Success', { message: 'Saved' }],
    ['/error', 'Error', { message: 'Boom' }],
    ['/new-alcohol', 'New Alcohol Type', undefined],
    ['/new-volume', 'New Volume', { alcoholTypeId: 1, alcoholTypeName: 'Vodka' }],
    ['/new-brand', 'New Beer Brand', undefined],
    ['/new-subtype', 'New Subtype', { alcoholTypeId: 1, alcoholTypeName: 'Vodka' }],
    ['/new-beer-flavour', 'New Beer Flavour', { brandId: 1, brandName: 'Heineken' }],
  ])('loads the page for %s', async (route, heading, state) => {
    renderWithProviders(<App />, { route, state });

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

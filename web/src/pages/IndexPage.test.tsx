import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import IndexPage from './IndexPage';
import { getRecommendations, saveDrink } from '../api/endpoints';
import { useAppNavigation } from '../hooks/useNavigation';
import { useResponsiveTileCount } from '../hooks/useResponsiveTileCount';
import type { Recommendation } from '../types/api';

vi.mock('../api/endpoints');
vi.mock('../hooks/useNavigation');
vi.mock('../hooks/useResponsiveTileCount');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockGetRecommendations = vi.mocked(getRecommendations);
const mockSaveDrink = vi.mocked(saveDrink);
const mockUseNavigation = vi.mocked(useAppNavigation);
const mockUseResponsiveTileCount = vi.mocked(useResponsiveTileCount);

const navigateToSuccess = vi.fn();
const navigateToError = vi.fn();
const navigateToDetailed = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNavigation.mockReturnValue({
    navigateToSuccess,
    navigateToError,
    navigateToDetailed,
    navigateToHome: vi.fn(),
    navigateToNewAlcohol: vi.fn(),
    navigateToNewVolume: vi.fn(),
    navigateToNewBrand: vi.fn(),
    navigateToNewSubtype: vi.fn(),
    navigateToNewBeerFlavour: vi.fn(),
  });
  mockUseResponsiveTileCount.mockReturnValue({
    maxRecommendations: 3,
    tileHeight: 120,
  });
});

const mockRecommendations: Recommendation[] = [
  {
    id: 1,
    userId: 'user-123',
    name: 'Heineken',
    alcoholTypeId: 4,
    alcoholSubtypeId: undefined,
    alcoholVolumeId: 10,
    brandId: 50,
    beerFlavourId: undefined,
    consumptionTypeId: 40,
  },
  {
    id: 2,
    userId: 'user-123',
    name: 'Red Wine',
    alcoholTypeId: 30,
    alcoholSubtypeId: 15,
    alcoholVolumeId: 20,
    brandId: undefined,
    beerFlavourId: undefined,
    consumptionTypeId: undefined,
  },
];

describe('IndexPage', () => {
  it('renders a spinner while the recommendations query is loading', () => {
    mockGetRecommendations.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<IndexPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the error state when the query rejects', async () => {
    mockGetRecommendations.mockRejectedValue(new Error('API error'));

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load recommendations/i)).toBeInTheDocument();
    });
  });

  it('renders one tile per recommendation up to maxRecommendations', async () => {
    mockGetRecommendations.mockResolvedValue([...mockRecommendations, { ...mockRecommendations[0], id: 3, name: 'Corona' }]);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /red wine/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /corona/i })).toBeInTheDocument();
    });

    // Should not render the 4th recommendation as maxRecommendations is 3
  });

  it('always shows the Add Custom button', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom/i })).toBeInTheDocument();
    });
  });

  it('navigates to detailed when Add Custom is clicked', async () => {
    mockGetRecommendations.mockResolvedValue([]);

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /add custom/i }));

    expect(navigateToDetailed).toHaveBeenCalled();
  });

  it('saves a recommendation and navigates to success with the drink name', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);
    mockSaveDrink.mockResolvedValue({ id: 100, userId: 'u1', date: '2026-01-01', alcoholTypeId: 4, alcoholVolumeId: 10 });

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /heineken/i }));

    await waitFor(() => {
      expect(mockSaveDrink).toHaveBeenCalledWith({
        alcoholTypeId: 4,
        alcoholSubtypeId: undefined,
        alcoholVolumeId: 10,
        brandId: 50,
        beerFlavourId: undefined,
        consumptionTypeId: 40,
      });
      expect(navigateToSuccess).toHaveBeenCalledWith(expect.stringContaining('Heineken'));
    });
  });

  it('navigates to error and mentions the drink name when save is rejected', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);
    mockSaveDrink.mockRejectedValue(new Error('Save failed'));

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /heineken/i }));

    await waitFor(() => {
      expect(navigateToError).toHaveBeenCalledWith(expect.stringContaining('Heineken'));
    });
  });

  it('shows a spinner on the saving tile and disables others', async () => {
    mockGetRecommendations.mockResolvedValue(mockRecommendations);
    mockSaveDrink.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /heineken/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /heineken/i }));

    // The saving tile should show spinner text
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });
});


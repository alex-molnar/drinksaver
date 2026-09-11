import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as endpoints from './endpoints';
import apiClient from './client';

vi.mock('./client');
vi.mock('../auth/keycloak');

const mockApiClient = vi.mocked(apiClient);

/**
 * These assertions are the contract with the backend, so they say what is sent AND, for
 * the eight calls that used to carry one, that no userId is sent. The negative half is
 * the point: the backend derives the caller from the JWT and ignores any userId in the
 * payload, and an exact-match assertion is what would catch someone reintroducing one.
 */
describe('api/endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveDrink', () => {
    it('posts to /v1/drinks/new with a defaulted date and no userId', async () => {
      mockApiClient.post.mockResolvedValue({
        data: [{ id: 1, userId: 'user-123', date: '2026-01-01', alcoholTypeId: 1 }],
      });

      const result = await endpoints.saveDrink({
        alcoholTypeId: 1,
        alcoholVolumeId: 10,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/v1/drinks/new', {
        alcoholTypeId: 1,
        alcoholVolumeId: 10,
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect(result).toEqual([expect.objectContaining({ id: 1 })]);
    });

    it('returns every id when several drinks were saved at once', async () => {
      mockApiClient.post.mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      const result = await endpoints.saveDrink({ alcoholTypeId: 1, alcoholVolumeId: 10, quantity: 3 });

      expect(result.map((d) => d.id)).toEqual([1, 2, 3]);
    });

    /**
     * Deploy skew: a new bundle can reach a 3.x backend for about a minute after a release.
     * Remove with the shim in 4.1.0.
     */
    it('wraps a bare object from a pre-4.0.0 backend', async () => {
      mockApiClient.post.mockResolvedValue({ data: { id: 7 } });

      const result = await endpoints.saveDrink({ alcoholTypeId: 1, alcoholVolumeId: 10 });

      expect(result).toEqual([{ id: 7 }]);
    });

    it('keeps an explicit date rather than defaulting it', async () => {
      mockApiClient.post.mockResolvedValue({ data: { id: 2 } });

      await endpoints.saveDrink({ alcoholTypeId: 1, alcoholVolumeId: 10, date: '2026-03-04' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/v1/drinks/new', {
        alcoholTypeId: 1,
        alcoholVolumeId: 10,
        date: '2026-03-04',
      });
    });
  });

  describe('getRecommendations', () => {
    it('gets /v1/recommendations/list', async () => {
      mockApiClient.get.mockResolvedValue({
        data: [{ id: 1, name: 'Beer', alcoholTypeId: 4 }],
      });

      const result = await endpoints.getRecommendations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/recommendations/list');
      expect(result).toHaveLength(1);
    });
  });

  describe('getAlcoholTypes', () => {
    it('gets /v1/alcohol/types with no query parameters', async () => {
      mockApiClient.get.mockResolvedValue({
        data: [{ id: 1, name: 'Beer' }],
      });

      await endpoints.getAlcoholTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/alcohol/types');
    });
  });

  describe('createAlcoholType', () => {
    it('posts to /v1/alcohol/types with the entry alone', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { id: 1, name: 'Beer', userId: 'user-123' },
      });

      await endpoints.createAlcoholType({ name: 'Beer' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/v1/alcohol/types', { name: 'Beer' });
    });
  });

  describe('getVolumesByAlcoholType', () => {
    it('gets /v1/alcohol/types/{id}/volumes', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getVolumesByAlcoholType(5);

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/alcohol/types/5/volumes');
    });
  });

  describe('createVolumeForAlcoholType', () => {
    it('posts to /v1/alcohol/types/{id}/volumes', async () => {
      mockApiClient.post.mockResolvedValue({ data: { id: 10 } });

      await endpoints.createVolumeForAlcoholType(5, { name: 'Pint', volume: 0.5 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/alcohol/types/5/volumes',
        { name: 'Pint', volume: 0.5 }
      );
    });
  });

  describe('getSubtypesByAlcoholType', () => {
    it('gets /v1/alcohol/types/{id}/subtypes with no query parameters', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getSubtypesByAlcoholType(7);

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/alcohol/types/7/subtypes');
    });
  });

  describe('createSubtypeForAlcoholType', () => {
    it('posts to /v1/alcohol/types/{id}/subtypes with the type id and name only', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { id: 30, name: 'Single Malt', alcoholTypeId: 7 },
      });

      await endpoints.createSubtypeForAlcoholType(7, 'Single Malt');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/alcohol/types/7/subtypes',
        { alcoholTypeId: 7, name: 'Single Malt' }
      );
    });
  });

  describe('getConsumptionTypes', () => {
    it('gets /v1/beer/consumption-types with amount query parameter', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getConsumptionTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/consumption-types', {
        params: { amount: 100 },
      });
    });

    it('allows overriding the amount parameter', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getConsumptionTypes(50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/consumption-types', {
        params: { amount: 50 },
      });
    });
  });

  describe('getBrands', () => {
    it('gets /v1/beer/brands with no query parameters', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getBrands();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/brands');
    });
  });

  describe('createBrand', () => {
    it('posts to /v1/beer/brands with brand data', async () => {
      mockApiClient.post.mockResolvedValue({ data: { id: 50, name: 'Heineken' } });

      await endpoints.createBrand({ name: 'Heineken' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/beer/brands',
        { name: 'Heineken' }
      );
    });
  });

  describe('getBeerFlavours', () => {
    it('gets /v1/beer/brands/{id}/flavours with no query parameters', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getBeerFlavours(50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/brands/50/flavours');
    });
  });

  describe('createBeerFlavour', () => {
    it('posts to /v1/beer/brands/{id}/flavours with the name only', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { id: 60, name: 'Lager', brandId: 50 },
      });

      await endpoints.createBeerFlavour(50, 'Lager');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/beer/brands/50/flavours',
        { name: 'Lager' }
      );
    });
  });

  describe('getSavedDrinksByDate', () => {
    it('gets /v1/drinks/date/{date}', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getSavedDrinksByDate('2026-01-01');

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/drinks/date/2026-01-01');
    });
  });

  describe('deleteDrinksByIds', () => {
    it('deletes /v1/drinks/byIds with drinkIds query parameter', async () => {
      mockApiClient.delete.mockResolvedValue({ data: 3 });

      await endpoints.deleteDrinksByIds([1, 2, 3]);

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/v1/drinks/byIds',
        {
          params: { drinkIds: [1, 2, 3] },
          paramsSerializer: { indexes: null },
        }
      );
    });

    it('uses paramsSerializer to flatten array parameters', async () => {
      mockApiClient.delete.mockResolvedValue({ data: 1 });

      await endpoints.deleteDrinksByIds([42]);

      const call = vi.mocked(mockApiClient.delete).mock.calls[0];
      expect(call[1]?.paramsSerializer).toEqual({ indexes: null });
    });
  });
});

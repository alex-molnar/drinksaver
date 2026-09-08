import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as endpoints from './endpoints';
import apiClient, { getCurrentUserId } from './client';

vi.mock('./client');
vi.mock('../auth/keycloak');

const mockApiClient = vi.mocked(apiClient);
const mockGetCurrentUserId = vi.mocked(getCurrentUserId);

describe('api/endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveDrink', () => {
    it('posts to /v1/drinks/new with the correct payload including userId and date', async () => {
      mockGetCurrentUserId.mockReturnValue('user-123');
      mockApiClient.post.mockResolvedValue({
        data: { id: 1, userId: 'user-123', date: '2026-01-01', alcoholTypeId: 1 },
      });

      const result = await endpoints.saveDrink({
        alcoholTypeId: 1,
        alcoholVolumeId: 10,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/v1/drinks/new', expect.objectContaining({
        userId: 'user-123',
        alcoholTypeId: 1,
        alcoholVolumeId: 10,
      }));
      expect(result.id).toBe(1);
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.saveDrink({ alcoholTypeId: 1, alcoholVolumeId: 10 }))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('getRecommendations', () => {
    it('gets /v1/recommendations/{userId}/list', async () => {
      mockGetCurrentUserId.mockReturnValue('user-456');
      mockApiClient.get.mockResolvedValue({
        data: [{ id: 1, name: 'Beer', alcoholTypeId: 4 }],
      });

      const result = await endpoints.getRecommendations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/recommendations/user-456/list');
      expect(result).toHaveLength(1);
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.getRecommendations())
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('getAlcoholTypes', () => {
    it('gets /v1/alcohol/types with userId query parameter', async () => {
      mockGetCurrentUserId.mockReturnValue('user-789');
      mockApiClient.get.mockResolvedValue({
        data: [{ id: 1, name: 'Beer' }],
      });

      await endpoints.getAlcoholTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/alcohol/types', {
        params: { userId: 'user-789' },
      });
    });

    it('still works when userId is undefined', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getAlcoholTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/alcohol/types', {
        params: { userId: undefined },
      });
    });
  });

  describe('createAlcoholType', () => {
    it('posts to /v1/alcohol/types with userId included', async () => {
      mockGetCurrentUserId.mockReturnValue('user-123');
      mockApiClient.post.mockResolvedValue({
        data: { id: 1, name: 'Beer', userId: 'user-123' },
      });

      await endpoints.createAlcoholType({ name: 'Beer' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/alcohol/types',
        expect.objectContaining({ name: 'Beer', userId: 'user-123' })
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.createAlcoholType({ name: 'Beer' }))
        .rejects.toThrow('User not authenticated');
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
    it('gets /v1/alcohol/types/{id}/subtypes with userId query parameter', async () => {
      mockGetCurrentUserId.mockReturnValue('user-999');
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getSubtypesByAlcoholType(7);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/v1/alcohol/types/7/subtypes',
        { params: { userId: 'user-999' } }
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.getSubtypesByAlcoholType(7))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('createSubtypeForAlcoholType', () => {
    it('posts to /v1/alcohol/types/{id}/subtypes with userId and name', async () => {
      mockGetCurrentUserId.mockReturnValue('user-555');
      mockApiClient.post.mockResolvedValue({
        data: { id: 30, name: 'Single Malt', alcoholTypeId: 7 },
      });

      await endpoints.createSubtypeForAlcoholType(7, 'Single Malt');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/alcohol/types/7/subtypes',
        { alcoholTypeId: 7, userId: 'user-555', name: 'Single Malt' }
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.createSubtypeForAlcoholType(7, 'Single Malt'))
        .rejects.toThrow('User not authenticated');
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
    it('gets /v1/beer/brands with userId query parameter', async () => {
      mockGetCurrentUserId.mockReturnValue('user-111');
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getBrands();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/brands', {
        params: { userId: 'user-111' },
      });
    });

    it('still works when userId is undefined', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getBrands();

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/beer/brands', {
        params: { userId: undefined },
      });
    });
  });

  describe('createBrand', () => {
    it('posts to /v1/beer/{userId}/brands with brand data', async () => {
      mockGetCurrentUserId.mockReturnValue('user-222');
      mockApiClient.post.mockResolvedValue({ data: { id: 50, name: 'Heineken' } });

      await endpoints.createBrand({ name: 'Heineken' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/beer/user-222/brands',
        { name: 'Heineken' }
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.createBrand({ name: 'Heineken' }))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('getBeerFlavours', () => {
    it('gets /v1/beer/brands/{id}/flavours with userId query parameter', async () => {
      mockGetCurrentUserId.mockReturnValue('user-333');
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getBeerFlavours(50);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/v1/beer/brands/50/flavours',
        { params: { userId: 'user-333' } }
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.getBeerFlavours(50))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('createBeerFlavour', () => {
    it('posts to /v1/beer/brands/{id}/flavours with userId and name', async () => {
      mockGetCurrentUserId.mockReturnValue('user-444');
      mockApiClient.post.mockResolvedValue({
        data: { id: 60, name: 'Lager', brandId: 50 },
      });

      await endpoints.createBeerFlavour(50, 'Lager');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/v1/beer/brands/50/flavours',
        { userId: 'user-444', name: 'Lager' }
      );
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.createBeerFlavour(50, 'Lager'))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('getSavedDrinksByDate', () => {
    it('gets /v1/drinks/{userId}/date/{date}', async () => {
      mockGetCurrentUserId.mockReturnValue('user-555');
      mockApiClient.get.mockResolvedValue({ data: [] });

      await endpoints.getSavedDrinksByDate('2026-01-01');

      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/drinks/user-555/date/2026-01-01');
    });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUserId.mockReturnValue(undefined);

      await expect(endpoints.getSavedDrinksByDate('2026-01-01'))
        .rejects.toThrow('User not authenticated');
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

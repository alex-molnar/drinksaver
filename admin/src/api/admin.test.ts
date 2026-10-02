import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import apiClient from './client';
import * as admin from './admin';

const originalAdapter = apiClient.defaults.adapter;
const calls: InternalAxiosRequestConfig[] = [];

describe('admin endpoint adapters', () => {
  beforeEach(() => {
    calls.length = 0;
    apiClient.defaults.adapter = async (config) => {
      calls.push(config);
      return { data: [], status: 200, statusText: 'OK', headers: {}, config };
    };
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('uses each documented method and path, with parent/body agreement and empty publish/delete bodies', async () => {
    const parentInput = { name: 'Child', colorPaletteId: 4, glasswareId: 5 };
    const responses = await Promise.all([
      admin.getDefaultTypes(), admin.getDefaultSubtypes(3), admin.createDefaultType({ name: 'Type', colorPaletteId: 4, glasswareId: 5 }), admin.createDefaultSubtype(3, parentInput),
      admin.updateType(6, { name: 'Type 2' }), admin.updateSubtype(7, { name: 'Child 2' }), admin.deleteType(6), admin.deleteSubtype(7),
      admin.getDefaultBrands(), admin.getDefaultFlavours(8), admin.getConsumptionTypes(), admin.createDefaultBrand({ name: 'Brand', colorPaletteId: 4, flavours: ['Pale'] }), admin.createDefaultFlavour(8, { name: 'Pale', colorPaletteId: 4 }), admin.createConsumptionType({ name: 'Can', glasswareId: 5 }),
      admin.updateBrand(8, { name: 'Brand 2' }), admin.updateFlavour(9, { name: 'Pale 2' }), admin.updateConsumptionType(10, { name: 'Bottle' }), admin.deleteBrand(8), admin.deleteFlavour(9), admin.deleteConsumptionType(10),
      admin.getPalettes(), admin.createPalette({ name: 'Amber', field: '#ffcc00' }), admin.updatePalette(4, { inkLight: '' }), admin.deletePalette(4), admin.getGlassware(), admin.createGlassware({ name: 'Glass', g: 'M0 0', l: 'M0 1' }), admin.updateGlassware(5, { f: '' }), admin.deleteGlassware(5),
      admin.getRecommendations(), admin.createRecommendation({ name: 'Drink', alcoholTypeId: 3, colorPaletteId: 4, glasswareId: 5 }), admin.updateRecommendations([{ id: 6, name: 'Drink 2' }]), admin.deleteRecommendation(6),
      admin.getUserTypes(), admin.getUserSubtypes(3), admin.publishType(11), admin.publishSubtype(12), admin.getUserBrands(), admin.getUserFlavours(8), admin.publishBrand(13), admin.publishFlavour(14), admin.getVolumesByType(3),
    ]);

    expect(responses[0]).toEqual([]);
    expect(calls.map(({ method, url }) => [method, url])).toEqual([
      ['get', '/v1/admin/default/alcohol/types'], ['get', '/v1/admin/default/alcohol/types/3/subtypes'], ['post', '/v1/admin/default/alcohol/types'], ['post', '/v1/admin/default/alcohol/types/3/subtypes'],
      ['patch', '/v1/admin/alcohol/types/6'], ['patch', '/v1/admin/alcohol/subtypes/7'], ['delete', '/v1/admin/alcohol/types/6'], ['delete', '/v1/admin/alcohol/subtypes/7'],
      ['get', '/v1/admin/default/beer/brands'], ['get', '/v1/admin/default/beer/brands/8/flavours'], ['get', '/v1/admin/default/beer/consumption-types'], ['post', '/v1/admin/default/beer/brands'], ['post', '/v1/admin/default/beer/brands/8/flavours'], ['post', '/v1/admin/default/beer/consumption-types'],
      ['patch', '/v1/admin/beer/brands/8'], ['patch', '/v1/admin/beer/brands/flavours/9'], ['patch', '/v1/admin/beer/consumption-types/10'], ['delete', '/v1/admin/beer/brands/8'], ['delete', '/v1/admin/beer/brands/flavours/9'], ['delete', '/v1/admin/beer/consumption-types/10'],
      ['get', '/v1/admin/design/color-palettes'], ['post', '/v1/admin/design/color-palette'], ['patch', '/v1/admin/design/color-palette/4'], ['delete', '/v1/admin/design/color-palette/4'], ['get', '/v1/admin/design/glassware'], ['post', '/v1/admin/design/glassware'], ['patch', '/v1/admin/design/glassware/5'], ['delete', '/v1/admin/design/glassware/5'],
      ['get', '/v1/admin/recommendations/list'], ['post', '/v1/admin/recommendations'], ['patch', '/v1/admin/recommendations/edit'], ['delete', '/v1/admin/recommendations/6'],
      ['get', '/v1/admin/user-defined/alcohol/types'], ['get', '/v1/admin/user-defined/alcohol/types/3/subtypes'], ['post', '/v1/admin/user-defined/alcohol/types/11/publish'], ['post', '/v1/admin/user-defined/alcohol/subtypes/12/publish'], ['get', '/v1/admin/user-defined/beer/brands'], ['get', '/v1/admin/user-defined/beer/brands/8/flavours'], ['post', '/v1/admin/user-defined/beer/brands/13/publish'], ['post', '/v1/admin/user-defined/beer/brands/flavours/14/publish'], ['get', '/v1/alcohol/types/3/volumes'],
    ]);
    expect(JSON.parse(calls[3].data as string)).toEqual({ ...parentInput, alcoholTypeId: 3 });
    for (const index of [34, 35, 38, 39]) expect(calls[index].data).toBeUndefined();
    expect(JSON.parse(calls[2].data as string)).not.toHaveProperty('userId');
    expect(JSON.parse(calls[2].data as string)).not.toHaveProperty('volumeIds');
  });
});

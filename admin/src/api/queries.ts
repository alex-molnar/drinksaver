export const keys = {
  types: ['default', 'types'] as const,
  subtypes: (id: number) => ['default', 'subtypes', id] as const,
  brands: ['default', 'brands'] as const,
  flavours: (id: number) => ['default', 'flavours', id] as const,
  consumptionTypes: ['default', 'consumption-types'] as const,
  palettes: ['design', 'palettes'] as const,
  glassware: ['design', 'glassware'] as const,
  recommendations: ['default', 'recommendations'] as const,
  userTypes: ['user-defined', 'types'] as const,
  userSubtypes: (id: number) => ['user-defined', 'subtypes', id] as const,
  userBrands: ['user-defined', 'brands'] as const,
  userFlavours: (id: number) => ['user-defined', 'flavours', id] as const,
  volumes: (id: number) => ['volumes', id] as const,
};

export const hasValidParentId = (id: number): boolean => Number.isSafeInteger(id) && id > 0;

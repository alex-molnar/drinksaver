import type { DefaultRecommendation, RecommendationUpdate } from '../../types/api';

export const renamePayload = (rows: readonly Pick<DefaultRecommendation, 'id' | 'name'>[], id: number, name: string): RecommendationUpdate[] => rows.map((row) => ({ id: row.id, name: row.id === id ? name : row.name }));

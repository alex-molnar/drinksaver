export const ADMIN_GROUP = 'admin';

export const isAdmin = (groups: unknown): boolean => {
  if (!Array.isArray(groups)) return false;
  return groups.some(
    (group) =>
      typeof group === 'string' && group.split('/').filter(Boolean).at(-1) === ADMIN_GROUP,
  );
};

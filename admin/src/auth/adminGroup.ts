/**
 * Whether a Keycloak `groups` claim grants admin access.
 *
 * Kept free of React and of keycloak-js so the one rule deciding whether the whole
 * application renders can be tested on its own.
 *
 * The claim's shape depends on the Group Membership mapper: with "Full group path"
 * on, Keycloak emits "/admin"; with it off, "admin"; a nested group emits
 * "/parent/admin". Matching the last path segment accepts all three without
 * accepting "/administrators", which a substring check would.
 *
 * This is a user experience guard. The backend rejecting /v1/admin/** for a
 * non-member is the actual control, so a token this mis-reads cannot grant access,
 * only waste a round trip.
 */
export const ADMIN_GROUP = 'admin';

export const isAdmin = (groups: unknown): boolean => {
  if (!Array.isArray(groups)) return false;
  return groups.some(
    (group) => typeof group === 'string' && group.split('/').pop() === ADMIN_GROUP
  );
};
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_GROUPS, hasRole } from '@/lib/permissions';

/**
 * Named capability booleans built on top of `useAuth()`. Prefer these over
 * inline `user?.role === 'admin' || ...` checks so every page agrees on what
 * each role can do.
 */
export function usePermissions() {
  const { user, isAdmin, canEdit } = useAuth();

  return useMemo(
    () => ({
      isAdmin,
      canEdit,
      isManager: user?.role === 'manager',
      isCoordinator: user?.role === 'local_mr_coordinator',
      isTot: user?.role === 'tot',
      /** Org-wide read/export views: reports, exports, branch-scoped overviews. */
      canViewOrgData: hasRole(user?.role, ROLE_GROUPS.CAN_VIEW_ORG_DATA),
    }),
    [user, isAdmin, canEdit]
  );
}

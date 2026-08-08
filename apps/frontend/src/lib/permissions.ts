import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

/**
 * Single source of truth for role sets used across route guards and
 * page-level permission checks. Every `allowedRoles` array on a
 * `<ProtectedRoute>` and every ad hoc `user?.role === 'x' || ...` chain
 * should reference one of these groups instead of re-declaring the set,
 * so route guards and in-page checks can never drift apart.
 */
export const ROLE_GROUPS = {
  ADMIN_ONLY: ['admin'],
  MANAGER_AND_ADMIN: ['admin', 'manager'],
  COORDINATOR_AND_ADMIN: ['local_mr_coordinator', 'admin'],
  /** Org-wide read/export views: admin, manager, and local MR coordinators. */
  CAN_VIEW_ORG_DATA: ['admin', 'manager', 'local_mr_coordinator'],
  ALL_ROLES: ['tot', 'local_mr_coordinator', 'manager', 'admin'],
} as const satisfies Record<string, readonly AppRole[]>;

export function hasRole(role: AppRole | null | undefined, group: readonly AppRole[]): boolean {
  return !!role && group.includes(role);
}

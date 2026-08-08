/**
 * Classifies an `audit_logs` row into a display severity.
 *
 * `audit_logs.action` is always exactly 'INSERT' | 'UPDATE' | 'DELETE' — it
 * comes straight from Postgres's `TG_OP` via the `audit_table_changes()`
 * trigger (see supabase/migrations/20260102122639_..._audit-logging-triggers.sql).
 * That trigger only fires on `farmers`, `profiles`, `sales`,
 * `commission_payouts`, and `user_roles` — the last one explicitly for
 * privilege-escalation detection — so changes to `user_roles` are treated as
 * more severe than the same operation on other tables.
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'success';

export function classifyAuditSeverity(action: string, entity: string): AuditSeverity {
  const isRoleChange = entity === 'user_roles';

  switch (action) {
    case 'INSERT':
      return 'success';
    case 'UPDATE':
      return isRoleChange ? 'warning' : 'info';
    case 'DELETE':
      return isRoleChange ? 'error' : 'warning';
    default:
      return 'info';
  }
}

import { AuditLogTable } from '@/components/admin/AuditLogTable';

export function AuditLog() {
  return (
    <AuditLogTable
      title="System Logs"
      description="Track system events and activities"
      iconSet="audit"
      showStatsCards
      showDetailedLoadingState
      exportFileNamePrefix="system_logs"
      pdfReportTitle="System Log Report"
    />
  );
}

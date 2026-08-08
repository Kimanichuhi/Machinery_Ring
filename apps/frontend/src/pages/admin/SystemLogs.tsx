import { AuditLogTable } from '@/components/admin/AuditLogTable';

export function SystemLogs() {
  return (
    <AuditLogTable
      title="System Logs"
      description="Live system activity"
      iconSet="system"
      exportFileNamePrefix="system_logs"
      pdfReportTitle="System Logs"
    />
  );
}

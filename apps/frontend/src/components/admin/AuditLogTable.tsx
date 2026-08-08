import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileText,
  FileSpreadsheet,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemLogs, DisplaySystemLog } from '@/hooks/api/useSystemLogs';
import { TablePagination } from '@/components/ui/table-pagination';
import { useClientPagination } from '@/hooks/useClientPagination';

type IconSet = 'audit' | 'system';

const LEVEL_ICONS: Record<IconSet, Record<string, JSX.Element>> = {
  audit: {
    success: <Plus className="h-4 w-4 text-green-500" />,
    info: <Eye className="h-4 w-4 text-blue-500" />,
    warning: <Edit className="h-4 w-4 text-amber-500" />,
    error: <Trash2 className="h-4 w-4 text-red-500" />,
  },
  system: {
    info: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
};

const LEVEL_BADGE_COLORS: Record<IconSet, Record<string, string>> = {
  audit: { success: 'bg-green-500', info: 'bg-blue-500', warning: 'bg-amber-500', error: 'bg-red-500' },
  system: { info: 'bg-blue-500', warning: 'bg-yellow-500', error: 'bg-red-500', success: 'bg-green-500' },
};

export interface AuditLogTableProps {
  /** Page title shown above the table. */
  title: string;
  description: string;
  /** Cosmetic icon/color preset — the two admin log pages historically used different sets. */
  iconSet?: IconSet;
  /** Show the 4 summary stat cards (Total/Info/Warnings/Errors). */
  showStatsCards?: boolean;
  /** Use the fuller Skeleton-based loading state and an explicit error banner. */
  showDetailedLoadingState?: boolean;
  exportFileNamePrefix?: string;
  pdfReportTitle?: string;
}

export function AuditLogTable({
  title,
  description,
  iconSet = 'system',
  showStatsCards = false,
  showDetailedLoadingState = false,
  exportFileNamePrefix = 'system_logs',
  pdfReportTitle = 'System Log Report',
}: AuditLogTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const { data: logs = [], isLoading, error } = useSystemLogs();

  const filteredLogs = logs.filter((log: DisplaySystemLog) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    return matchesSearch && matchesLevel && matchesModule;
  });

  const {
    page,
    pageSize,
    totalPages,
    paginatedItems: paginatedLogs,
    setPage,
    setPageSize,
  } = useClientPagination(filteredLogs, 25);

  const getLevelIcon = (level: string) => LEVEL_ICONS[iconSet][level] ?? <Eye className="h-4 w-4" />;

  const getLevelBadge = (level: string) => (
    <Badge className={LEVEL_BADGE_COLORS[iconSet][level] ?? 'bg-gray-500'}>{level.toUpperCase()}</Badge>
  );

  const exportToExcel = async () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const data = filteredLogs.map((log: DisplaySystemLog) => ({
      Timestamp: log.timestamp,
      Level: log.level.toUpperCase(),
      Module: log.module,
      Message: log.message,
      User: log.userName || 'System',
    }));
    const { exportToExcelFile } = await import('@/lib/excelUtils');
    await exportToExcelFile(data, exportFileNamePrefix, 'System Logs');
    toast.success('Logs exported to Excel');
  };

  const exportToPDF = async () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.setTextColor(34, 139, 34);
    doc.text(pdfReportTitle, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total: ${filteredLogs.length} entries`, 14, 28);

    const headers = ['Timestamp', 'Level', 'Module', 'Message', 'User'];
    const rows = filteredLogs.map((log: DisplaySystemLog) => [
      log.timestamp,
      log.level.toUpperCase(),
      log.module,
      log.message.substring(0, 50) + (log.message.length > 50 ? '...' : ''),
      log.userName || 'System',
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`${exportFileNamePrefix}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Logs exported to PDF');
  };

  const modules = [...new Set(logs.map((l: DisplaySystemLog) => l.module))];

  const infoCount = logs.filter((l: DisplaySystemLog) => l.level === 'info').length;
  const warningCount = logs.filter((l: DisplaySystemLog) => l.level === 'warning').length;
  const errorCount = logs.filter((l: DisplaySystemLog) => l.level === 'error').length;

  if (isLoading) {
    if (showDetailedLoadingState) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      );
    }
    return <p className="text-muted-foreground">Loading logs…</p>;
  }

  if (error && showDetailedLoadingState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="w-16 h-16 mb-4 text-muted-foreground" />
        <p>Failed to load logs. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={logs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Logs
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportToExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showStatsCards && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="font-heading text-2xl font-bold">{logs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="font-heading text-2xl font-bold">{infoCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Edit className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="font-heading text-2xl font-bold">{warningCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-red-500/10 p-3">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="font-heading text-2xl font-bold">{errorCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log: DisplaySystemLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{getLevelIcon(log.level)}</TableCell>
                    <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                    <TableCell>{getLevelBadge(log.level)}</TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{log.message}</TableCell>
                    <TableCell>{log.userName || 'System'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={filteredLogs.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

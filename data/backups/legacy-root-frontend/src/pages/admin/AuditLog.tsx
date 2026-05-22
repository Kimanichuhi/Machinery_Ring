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
import { Search, Download, Eye, Edit, Trash2, Plus, FileText, FileSpreadsheet, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcelFile } from '@/lib/excelUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSystemLogs, DisplaySystemLog } from '@/hooks/api/useSystemLogs';

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  // Fetch audit logs from API
  const { data: auditLogs = [], isLoading, error } = useSystemLogs();

  const filteredLogs = auditLogs.filter((log: DisplaySystemLog) => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesAction = actionFilter === 'all' || log.level === actionFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    return matchesSearch && matchesAction && matchesModule;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return <Plus className="h-4 w-4 text-green-500" />;
      case 'info': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'warning': return <Edit className="h-4 w-4 text-amber-500" />;
      case 'error': return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-500',
      info: 'bg-blue-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
    };
    return <Badge className={colors[level] || 'bg-gray-500'}>{level.toUpperCase()}</Badge>;
  };

  const exportToExcel = async () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const data = filteredLogs.map((log: DisplaySystemLog) => ({
      'Timestamp': log.timestamp,
      'Level': log.level.toUpperCase(),
      'Module': log.module,
      'Message': log.message,
      'User': log.userName || 'System',
    }));
    await exportToExcelFile(data, `system_logs`, 'System Logs');
    toast.success('System logs exported to Excel');
  };

  const exportToPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.setTextColor(34, 139, 34);
    doc.text('System Log Report', 14, 20);
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

    doc.save(`system_logs_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('System logs exported to PDF');
  };

  const modules = [...new Set(auditLogs.map((l: DisplaySystemLog) => l.module))];

  // Stats
  const infoCount = auditLogs.filter((l: DisplaySystemLog) => l.level === 'info').length;
  const warningCount = auditLogs.filter((l: DisplaySystemLog) => l.level === 'warning').length;
  const errorCount = auditLogs.filter((l: DisplaySystemLog) => l.level === 'error').length;
  const successCount = auditLogs.filter((l: DisplaySystemLog) => l.level === 'success').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="w-16 h-16 mb-4 text-muted-foreground" />
        <p>Failed to load system logs. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground">Track system events and activities</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={auditLogs.length === 0}>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{auditLogs.length}</p>
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
              <p className="text-2xl font-bold">{infoCount}</p>
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
              <p className="text-2xl font-bold">{warningCount}</p>
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
              <p className="text-2xl font-bold">{errorCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
            <Select value={actionFilter} onValueChange={setActionFilter}>
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
                {modules.map(module => (
                  <SelectItem key={module} value={module}>{module}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No system logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: DisplaySystemLog) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
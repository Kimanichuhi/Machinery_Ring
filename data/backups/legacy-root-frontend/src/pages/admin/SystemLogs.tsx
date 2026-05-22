import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Download, AlertTriangle, Info, AlertCircle, CheckCircle,
  FileSpreadsheet, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcelFile } from '@/lib/excelUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSystemLogs } from '@/hooks/api/useSystemLogs';

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  module: string;
  message: string;
  userId?: string;
  userName?: string;
}

export function SystemLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const { data: logs = [], isLoading } = useSystemLogs();

  const filteredLogs = logs.filter((log: SystemLog) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

    return matchesSearch && matchesLevel && matchesModule;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getLevelBadge = (level: string) => (
    <Badge className={{
      info: 'bg-blue-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      success: 'bg-green-500',
    }[level]}>
      {level.toUpperCase()}
    </Badge>
  );

  const exportToExcel = async () => {
    await exportToExcelFile(filteredLogs, 'system_logs', 'System Logs');
    toast.success('Logs exported to Excel');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    autoTable(doc, {
      head: [['Timestamp', 'Level', 'Module', 'Message', 'User']],
      body: filteredLogs.map(log => [
        log.timestamp,
        log.level.toUpperCase(),
        log.module,
        log.message,
        log.userName || '-',
      ]),
    });
    doc.save('system_logs.pdf');
    toast.success('Logs exported to PDF');
  };

  const modules = [...new Set(logs.map((l: SystemLog) => l.module))];

  if (isLoading) {
    return <p className="text-muted-foreground">Loading system logs…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Live system activity</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export Logs
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportToExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log: SystemLog) => (
                <TableRow key={log.id}>
                  <TableCell>{getLevelIcon(log.level)}</TableCell>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{getLevelBadge(log.level)}</TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>{log.userName || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, MapPin, Calendar, MessageSquare, Download, FileSpreadsheet, FileText, Eye } from 'lucide-react';
import { exportVisitsToExcel, exportVisitsToPDF } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VisitFormDialog } from '@/components/forms/VisitFormDialog';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Visit } from '@/types';
import { useVisits, useCreateVisit } from '@/hooks/api';

// Visit purposes per request (multi-select supported)
const VISIT_PURPOSES = [
  'Follow-up',
  'Soil Testing',
  'Crop Monitoring',
  'Product Delivery',
  'Training',
  'Group Meeting',
  'Problem Solving',
  'New Registration',
];

export function Visits() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { addNotification } = useNotifications();
  const { user, isAdmin } = useAuth();

  // Only Admin can log visits (removed TOT)
  const canLogVisit = isAdmin;

  // API hooks
  const { data: visits = [], isLoading } = useVisits();
  const createVisit = useCreateVisit();

  const filteredVisits = visits.filter(visit => {
    const farmerName = visit.farmerName ?? '';
    const matchesSearch = farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPurpose = purposeFilter === 'all' || visit.purpose.toLowerCase().includes(purposeFilter.toLowerCase());
    return matchesSearch && matchesPurpose;
  });

  const handleAddVisit = (data: any) => {
    if (!canLogVisit) {
      toast.error('You do not have permission to log visits');
      return;
    }
    createVisit.mutate(data);
    addNotification({
      title: 'Field Visit Logged',
      message: `Visit recorded successfully`,
      type: 'visit',
    });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  // Calculate stats - Updated per request: removed "With Photo" and "GPS Tagged", added "Total Visits (Current Month)"
  const now = new Date();
  const thisMonthVisits = visits.filter(v => {
    const visitDate = new Date(v.date);
    return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
  }).length;

  const thisWeekVisits = visits.filter(v => {
    const visitDate = new Date(v.date);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return visitDate >= weekStart;
  }).length;

  // Manager and Coordinator can export reports
  const canExport = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'local_mr_coordinator';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Farm Visits</h1>
          <p className="text-sm text-muted-foreground">
            {canLogVisit ? 'Log and manage field visits' : 'View field visits and engagements'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { exportVisitsToExcel(filteredVisits); toast.success('Exported to Excel'); }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportVisitsToPDF(filteredVisits); toast.success('Exported to PDF'); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Admin and TOT: Log Visit button */}
          {canLogVisit && (
            <Button variant="earth" size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Visit
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Updated per request */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="earth">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary-foreground/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading">{visits.length}</p>
              <p className="text-xs sm:text-sm opacity-80">Total Visits</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-primary">{thisMonthVisits}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-accent-foreground">{thisWeekVisits}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">This Week</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Purposes</SelectItem>
                {VISIT_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose} value={purpose.toLowerCase()}>{purpose}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredVisits.map((visit, index) => (
          <Card 
            key={visit.id}
            variant="elevated"
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0">
                    <MapPin className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-semibold text-sm sm:text-base">{visit.farmerName}</h3>
                        <Badge variant="sage" className="text-xs">{visit.purpose}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate(`/visits/${visit.id}`)}>
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {formatDate(visit.date)}
                      </span>
                      {visit.gpsLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          GPS: {visit.gpsLocation.lat.toFixed(4)}, {visit.gpsLocation.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-muted-foreground">{visit.notes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visit Form Dialog - Admin and TOT can log visits */}
      {canLogVisit && (
        <VisitFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleAddVisit}
        />
      )}
    </div>
  );
}

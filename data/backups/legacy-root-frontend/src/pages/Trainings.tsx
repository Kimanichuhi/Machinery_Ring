import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, GraduationCap, Calendar, MapPin, Users, Clock, Download, FileSpreadsheet, FileText, CheckCircle, Eye, UserPlus } from 'lucide-react';
import { exportTrainingsToExcel, exportTrainingsToPDF } from '@/lib/exportUtils';
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
import { TrainingFormDialog } from '@/components/forms/TrainingFormDialog';
import { AttendanceModal } from '@/components/trainings/AttendanceModal';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Training } from '@/types';
import { useTrainings, useCreateTraining } from '@/hooks/api/useTrainings';

// Training types per request - removed Seminars, Online Training
const TRAINING_TYPES = ['Field Day', 'Demonstration', 'Workshop'];

export function Trainings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const { addNotification } = useNotifications();
  const { user, isAdmin, canEdit } = useAuth();

  // API hooks
  const { data: trainings = [], isLoading } = useTrainings();
  const createTraining = useCreateTraining();

  const filteredTrainings = trainings.filter(training => {
    const trainingType = training.type ?? '';
    const matchesSearch = training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainingType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (training.trainer || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || trainingType.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Stats - Total Trainings, Completed Trainings, Total Attendees
  const totalTrainings = trainings.length;
  const completedCount = trainings.filter(t => t.status === 'Completed' || t.status === 'completed').length;
  const totalAttendees = trainings.reduce((acc, t) => acc + (t.attendees_count || t.attendees?.length || 0), 0);

  const handleAddTraining = (data: any) => {
    if (!canEdit) {
      toast.error('You do not have permission to add trainings');
      return;
    }
    createTraining.mutate(data);
    addNotification({
      title: 'Training Recorded',
      message: `Training recorded successfully`,
      type: 'training',
    });
  };

  const handleOpenAttendance = (training: any) => {
    setSelectedTraining(training);
    setIsAttendanceOpen(true);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'field day': return 'wheat';
      case 'demonstration': return 'forest';
      case 'workshop': return 'info';
      default: return 'sage';
    }
  };

  // Manager and Coordinator can export reports
  const canExport = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'local_mr_coordinator';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
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
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Trainings</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Manage capacity building sessions' : 'View capacity building sessions'}
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
                <DropdownMenuItem onClick={() => { exportTrainingsToExcel(filteredTrainings); toast.success('Exported to Excel'); }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportTrainingsToPDF(filteredTrainings); toast.success('Exported to PDF'); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Admin only: Add Training button */}
          {isAdmin && (
            <Button variant="forest" size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Training
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Updated: Total Trainings, Completed, Total Attendees */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading">{totalTrainings}</p>
              <p className="text-xs sm:text-sm opacity-80">Total Trainings</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-700">{completedCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-secondary">{totalAttendees}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Attendees</p>
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
                placeholder="Search trainings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TRAINING_TYPES.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trainings List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredTrainings.map((training, index) => (
          <Card 
            key={training.id}
            variant="elevated"
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-semibold text-sm sm:text-base">{training.title}</h3>
                        <Badge variant={getTypeColor(training.type ?? '') as any} className="text-xs">{training.type ?? ''}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => navigate(`/trainings/${training.id}`)}>
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => handleOpenAttendance(training)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Facilitated by {training.trainer || training.trainerName || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {formatDate(training.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {training.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {training.duration} hours
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {training.attendees_count || training.attendees?.length || 0} attendees
                  </span>
                </div>
                
                {/* Topics */}
                {training.topics && training.topics.length > 0 && (
                  <div className="pt-3 sm:pt-4 border-t border-border">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Topics covered:</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {training.topics.map((topic: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Training Form Dialog - Admin only */}
      {isAdmin && (
        <TrainingFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleAddTraining}
        />
      )}

      {/* Attendance Modal - Admin only */}
      {isAdmin && selectedTraining && (
        <AttendanceModal
          open={isAttendanceOpen}
          onOpenChange={setIsAttendanceOpen}
          trainingId={selectedTraining.id}
          trainingTitle={selectedTraining.title}
          localMrId={selectedTraining.local_mr_id}
        />
      )}
    </div>
  );
}

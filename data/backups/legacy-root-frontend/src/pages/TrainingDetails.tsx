import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, GraduationCap, Calendar, MapPin, Clock, Users, User, Building2, UserPlus, Phone, Home } from 'lucide-react';
import { useTraining } from '@/hooks/api/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { AttendanceModal } from '@/components/trainings/AttendanceModal';
import { supabase } from '@/integrations/supabase/client';

interface AttendeeDetail {
  id: string;
  name: string;
  phone: string | null;
  village: string | null;
  ward: string | null;
  type: 'farmer' | 'tot';
}

export function TrainingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: training, isLoading, error } = useTraining(id || '');
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attendeeDetails, setAttendeeDetails] = useState<AttendeeDetail[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Fetch attendee details when training is loaded
  useEffect(() => {
    async function fetchAttendeeDetails() {
      if (!training?.attendees || training.attendees.length === 0) {
        setAttendeeDetails([]);
        return;
      }

      setLoadingAttendees(true);
      try {
        const attendees: AttendeeDetail[] = [];
        
        // Separate farmer IDs and profile IDs (TOTs)
        const farmerIds = training.attendees
          .map((a: any) => a.farmer_id)
          .filter((id: string | null): id is string => id !== null);
        
        const profileIds = training.attendees
          .map((a: any) => a.profile_id)
          .filter((id: string | null): id is string => id !== null);

        // Fetch farmer details
        if (farmerIds.length > 0) {
          const { data: farmers, error: farmersError } = await supabase
            .from('farmers')
            .select('id, name, phone, village, ward')
            .in('id', farmerIds);

          if (!farmersError && farmers) {
            attendees.push(...farmers.map(f => ({ ...f, type: 'farmer' as const })));
          }
        }

        // Fetch TOT (profile) details
        if (profileIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, phone')
            .in('id', profileIds);

          if (!profilesError && profiles) {
            attendees.push(...profiles.map(p => ({ 
              id: p.id, 
              name: p.name || 'Unknown TOT', 
              phone: p.phone, 
              village: null, 
              ward: null,
              type: 'tot' as const 
            })));
          }
        }

        setAttendeeDetails(attendees);
      } catch (err) {
        console.error('Error fetching attendee details:', err);
        setAttendeeDetails([]);
      } finally {
        setLoadingAttendees(false);
      }
    }

    fetchAttendeeDetails();
  }, [training?.attendees]);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/trainings')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Trainings
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Training not found or an error occurred.</p>
        </Card>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'field day': return 'wheat';
      case 'demonstration': return 'forest';
      case 'workshop': return 'info';
      default: return 'sage';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/trainings')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Training Details</h1>
            <p className="text-sm text-muted-foreground">View training information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setIsAttendanceOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Attendance
            </Button>
          )}
        </div>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {training.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getTypeColor(training.type || '') as any}>{training.type}</Badge>
              <Badge variant="success">Completed</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trainer</p>
                  <p className="font-medium">{training.trainer || training.trainerName || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Local MR</p>
                  <p className="font-medium">{training.local_mr_name || 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(training.date)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{training.location || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{training.duration} hours</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attendees</p>
                  <p className="font-medium">{training.attendees?.length || 0} farmers</p>
                </div>
              </div>
            </div>
          </div>

          {training.topics && training.topics.length > 0 && (
            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground mb-3">Topics Covered</p>
              <div className="flex flex-wrap gap-2">
                {training.topics.map((topic: string, i: number) => (
                  <Badge key={i} variant="outline">{topic}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Attendance List */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Attendance List
              </h3>
              <Badge variant="secondary">{attendeeDetails.length} attendees</Badge>
            </div>
            
            {loadingAttendees ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : attendeeDetails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No attendance recorded yet</p>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAttendanceOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Attendance
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {attendeeDetails.map((farmer, index) => (
                  <div 
                    key={farmer.id} 
                    className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {index + 1}
                    </div>
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{farmer.name}</p>
                        <Badge variant={farmer.type === 'tot' ? 'sage' : 'wheat'} className="text-[10px] px-1.5 py-0">
                          {farmer.type === 'tot' ? 'TOT' : 'Farmer'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {farmer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {farmer.phone}
                          </span>
                        )}
                        {farmer.village && (
                          <span className="flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {farmer.village}
                          </span>
                        )}
                        {farmer.ward && (
                          <span className="text-muted-foreground/70">
                            • {farmer.ward}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <AttendanceModal
          open={isAttendanceOpen}
          onOpenChange={setIsAttendanceOpen}
          trainingId={id || ''}
          trainingTitle={training.title}
          localMrId={training.local_mr_id || undefined}
        />
      )}
    </div>
  );
}

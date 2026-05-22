// src/pages/admin/LocalMRDetails.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Building2,
  Users,
  UserCog,
  MapPin,
  TrendingUp,
  ShoppingCart,
  GraduationCap,
  Calendar,
  Loader2,
  DollarSign,
  Activity,
} from 'lucide-react';

import { useLocalMR } from '@/hooks/api/useLocalMRs';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useSales } from '@/hooks/api/useSales';
import { useTrainings } from '@/hooks/api/useTrainings';
import { useVisits } from '@/hooks/api/useVisits';
import { useMachineryBookings } from '@/hooks/api/useMachineryBookings';
import { useUsers } from '@/hooks/api/useUsers';

export function LocalMRDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch Local MR details
  const { data: localMR, isLoading: mrLoading } = useLocalMR(id || '');

  // Fetch related data filtered by this Local MR
  const { data: farmers = [] } = useFarmers({ localMrId: id });
  const { data: sales = [] } = useSales({ localMrId: id });
  const { data: trainings = [] } = useTrainings({ localMrId: id });
  const { data: visits = [] } = useVisits({ localMrId: id });
  const { data: bookings = [] } = useMachineryBookings();
  const { data: allUsers = [] } = useUsers({ localMrId: id });

  // Filter bookings by local_mr_id (since the hook doesn't support filter)
  const filteredBookings = bookings.filter((b: any) => b.local_mr_id === id);
  // Filter TOTs assigned to this Local MR
  const tots = allUsers.filter((u: any) => u.role === 'tot' && u.local_mr_id === id);

  if (mrLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Local MR details…</span>
      </div>
    );
  }

  if (!localMR) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Local MR not found.</p>
        <Button onClick={() => navigate('/local-mrs')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Local MRs
        </Button>
      </div>
    );
  }

  // Calculate performance metrics
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
  const totalCommission = sales.reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0);
  const completedTrainings = trainings.filter((t: any) => t.status === 'completed').length;
  const totalAttendees = trainings.reduce((sum: number, t: any) => sum + (t.attendees_count || 0), 0);
  const completedBookings = filteredBookings.filter((b: any) => b.status === 'completed').length;
  const totalVisits = visits.length;

  // Get coordinator name from the joined data
  const coordinatorName = localMR?.coordinator?.name || 'Unassigned';
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

  // Recent activity - combine and sort all activities
  const recentActivity = [
    ...sales.slice(0, 10).map((s: any) => ({
      type: 'sale' as const,
      date: s.sale_date,
      description: `Sale of ${s.product_name || 'Product'} to ${s.farmer_name || 'Farmer'}`,
      amount: s.total_amount,
    })),
    ...trainings.slice(0, 10).map((t: any) => ({
      type: 'training' as const,
      date: t.scheduled_date,
      description: `Training: ${t.title}`,
      count: t.attendees_count,
    })),
    ...visits.slice(0, 10).map((v: any) => ({
      type: 'visit' as const,
      date: v.visit_date,
      description: `Visit to ${v.farmer_name || 'Farmer'} - ${v.purpose}`,
    })),
    ...filteredBookings.slice(0, 10).map((b: any) => ({
      type: 'booking' as const,
      date: b.start_date,
      description: `Machinery booking: ${b.machinery_name || 'Equipment'}`,
      status: b.status,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/local-mrs')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            {localMR.name}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {localMR.ward ? `${localMR.ward}, ` : ''}{localMR.sub_county}, {localMR.county}
          </p>
        </div>
        <Badge variant={localMR.status === 'active' ? 'success' : 'secondary'}>
          {localMR.status}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Farmers" value={farmers.length} color="primary" />
        <StatCard icon={UserCog} label="TOTs" value={tots.length} color="secondary" />
        <StatCard icon={ShoppingCart} label="Sales" value={totalSales} color="primary" />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(totalRevenue)} color="success" />
        <StatCard icon={GraduationCap} label="Trainings" value={completedTrainings} color="accent" />
        <StatCard icon={MapPin} label="Visits" value={totalVisits} color="muted" />
      </div>

      {/* Coordinator Info */}
      {coordinatorName && coordinatorName !== 'Unassigned' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coordinator</p>
                <p className="font-semibold">{coordinatorName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tots">TOTs ({tots.length})</TabsTrigger>
          <TabsTrigger value="farmers">Farmers ({farmers.length})</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold text-primary">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Commission</span>
                  <span className="font-semibold">{formatCurrency(totalCommission)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Training Attendees</span>
                  <span className="font-semibold">{totalAttendees}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Completed Bookings</span>
                  <span className="font-semibold">{completedBookings}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Field Visits</span>
                  <span className="font-semibold">{totalVisits}</span>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-semibold">{localMR.region}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">County</span>
                  <span className="font-semibold">{localMR.county}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Sub-County</span>
                  <span className="font-semibold">{localMR.sub_county || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Ward</span>
                  <span className="font-semibold">{localMR.ward || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TOTs Tab */}
        <TabsContent value="tots">
          <Card>
            <CardHeader>
              <CardTitle>TOT Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {tots.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No TOTs assigned to this Local MR yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Sales</TableHead>
                      <TableHead className="text-center">Commission</TableHead>
                      <TableHead className="text-center">Visits</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tots.map((tot: any) => (
                      <TableRow key={tot.id}>
                        <TableCell className="font-medium">{tot.name}</TableCell>
                        <TableCell>{tot.email}</TableCell>
                        <TableCell>{tot.phone || '-'}</TableCell>
                        <TableCell className="text-center">{tot.salesCount || 0}</TableCell>
                        <TableCell className="text-center text-primary">
                          {formatCurrency(tot.totalCommission || 0)}
                        </TableCell>
                        <TableCell className="text-center">{tot.visitsCount || 0}</TableCell>
                        <TableCell>
                          {tot.lastActivityDate ? formatDate(tot.lastActivityDate) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Farmers Tab */}
        <TabsContent value="farmers">
          <Card>
            <CardHeader>
              <CardTitle>Registered Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              {farmers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No farmers registered in this Local MR yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Visits</TableHead>
                      <TableHead className="text-center">Trainings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmers.slice(0, 20).map((farmer: any) => (
                      <TableRow 
                        key={farmer.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/farmers/${farmer.id}`)}
                      >
                        <TableCell className="font-medium">{farmer.name}</TableCell>
                        <TableCell>{farmer.phone || '-'}</TableCell>
                        <TableCell>
                          {farmer.village ? `${farmer.village}, ` : ''}{farmer.ward || ''}
                        </TableCell>
                        <TableCell className="text-center">{farmer.visitsCount || 0}</TableCell>
                        <TableCell className="text-center">{farmer.trainingsAttended || 0}</TableCell>
                        <TableCell>
                          <Badge variant={farmer.status === 'active' ? 'success' : 'secondary'}>
                            {farmer.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {farmers.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing 20 of {farmers.length} farmers
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No recent activity recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'sale' ? 'bg-primary/10 text-primary' :
                        activity.type === 'training' ? 'bg-accent/20 text-accent-foreground' :
                        activity.type === 'visit' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-secondary/20 text-secondary'
                      }`}>
                        {activity.type === 'sale' && <ShoppingCart className="w-4 h-4" />}
                        {activity.type === 'training' && <GraduationCap className="w-4 h-4" />}
                        {activity.type === 'visit' && <MapPin className="w-4 h-4" />}
                        {activity.type === 'booking' && <Calendar className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                      </div>
                      {'amount' in activity && (
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(activity.amount)}
                        </span>
                      )}
                      {'count' in activity && (
                        <Badge variant="outline">{activity.count} attendees</Badge>
                      )}
                      {'status' in activity && (
                        <Badge variant={activity.status === 'completed' ? 'success' : 'info'}>
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for stat cards
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: 'primary' | 'secondary' | 'accent' | 'muted' | 'success';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/20 text-secondary',
    accent: 'bg-accent/20 text-accent-foreground',
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold font-heading truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

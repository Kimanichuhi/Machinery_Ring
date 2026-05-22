import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFarmers, useSales, useVisits, useLocalMRs, useFarmerTrainings } from '@/hooks/api';
import { useMachineryBookings } from '@/hooks/api/useMachineryBookings';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, ShoppingCart, Tractor, GraduationCap, Users, Star, TrendingUp, Download } from 'lucide-react';
import { Farmer, Sale, Visit } from '@/types';
import { toast } from 'sonner';
import { exportToExcelFile } from '@/lib/excelUtils';
export function FarmerProfile() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();

  // API hooks - data is already normalized by select transforms
  const {
    data: farmers = []
  } = useFarmers();
  const {
    data: sales = []
  } = useSales();
  const {
    data: bookings = []
  } = useMachineryBookings();
  const {
    data: visits = []
  } = useVisits();
  const {
    data: localMRs = []
  } = useLocalMRs();

  // Fetch training attendance specifically for this farmer
  const {
    data: farmerTrainings = []
  } = useFarmerTrainings(id || '');
  const farmer = (farmers as Farmer[]).find(f => f.id === id);
  if (!farmer) {
    return <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Farmer Not Found</h2>
          <p className="text-muted-foreground mb-4">The farmer profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/farmers')}>Back to Farmers</Button>
        </Card>
      </div>;
  }
  const localMr = (localMRs as {
    id: string;
    name: string;
  }[]).find(mr => mr.id === farmer.localMrId);
  const farmerSales = (sales as Sale[]).filter(s => s.farmerId === farmer.id);
  const farmerBookings = (bookings || []).filter(b => b.farmer_id === farmer.id);
  const farmerVisits = (visits as Visit[]).filter(v => v.farmerId === farmer.id);
  // farmerTrainings is already filtered by the hook

  const totalSpent = farmerSales.reduce((acc, s) => acc + s.total, 0);
  const bookingsSpent = 0; // Bookings don't have direct cost - calculated from machinery rates

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Pioneer':
        return 'wheat';
      case 'Existing':
        return 'forest';
      default:
        return 'sage';
    }
  };
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'High-Value':
        return 'success';
      case 'Active':
        return 'forest';
      default:
        return 'warning';
    }
  };
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };
  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;
  const exportVisitsToCSV = async () => {
    if (farmerVisits.length === 0) {
      toast.error('No visits to export');
      return;
    }
    const exportData = farmerVisits.map((visit: any, idx) => ({
      '#': idx + 1,
      'Date': formatDate(visit.date || visit.visit_date),
      'Purpose': visit.purpose,
      'Notes': visit.notes || '',
      'TOT': visit.totName || visit.tot_name || '',
      'Follow-up Required': visit.follow_up_required ? 'Yes' : 'No',
      'Follow-up Date': visit.follow_up_date ? formatDate(visit.follow_up_date) : ''
    }));
    await exportToExcelFile(exportData, `${farmer.name}_visit_history`, 'Visit History');
    toast.success('Visit history exported');
  };
  return <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/farmers')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{farmer.name}</h1>
          <p className="text-sm text-muted-foreground">Farmer Profile</p>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl sm:text-2xl flex-shrink-0">
                {farmer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getCategoryColor(farmer.farmerCategory) as any}>{farmer.farmerCategory}</Badge>
                  <Badge variant={getRatingColor(farmer.farmerRating) as any} className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {farmer.farmerRating}
                  </Badge>
                  <Badge variant="outline">{farmer.valueChain}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{farmer.phone}</span>
                  </div>
                  {farmer.email && <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{farmer.email}</span>
                    </div>}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{farmer.location.village}, {farmer.location.county}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Registered {formatDate(farmer.createdAt)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm"><span className="text-muted-foreground">Local MR:</span> {localMr?.name || farmer.localMrName}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Value Chain:</span> {farmer.valueChain}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="forest">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Engagement Summary
            </h3>
            <div className="space-y-3 text-sm">
              
              <div className="flex justify-between">
                <span className="opacity-80">Amount Spent</span>
                <span className="font-semibold">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Machinery Bookings</span>
                <span className="font-semibold">{farmerBookings.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="opacity-80">Trainings Attended</span>
                <span className="font-semibold">{farmerTrainings.length || farmer.trainingsAttended}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Field Visits</span>
                <span className="font-semibold">{farmer.visitsCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-primary">{farmerSales.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Sales</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Tractor className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-secondary">{farmerBookings.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Bookings</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-accent-foreground">{farmerTrainings.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Trainings</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-700">{farmerVisits.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Visits</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed History Tabs */}
      <Card variant="elevated">
        <Tabs defaultValue="sales" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="sales" className="flex-1 sm:flex-none">Sales ({farmerSales.length})</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1 sm:flex-none">Bookings ({farmerBookings.length})</TabsTrigger>
              <TabsTrigger value="trainings" className="flex-1 sm:flex-none">Trainings ({farmerTrainings.length})</TabsTrigger>
              <TabsTrigger value="visits" className="flex-1 sm:flex-none">Visits ({farmerVisits.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <TabsContent value="sales" className="mt-0">
              {farmerSales.length === 0 ? <p className="text-muted-foreground text-center py-8">No sales recorded yet.</p> : <div className="space-y-3">
                  {farmerSales.map(sale => <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{sale.productName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(sale.date)} • Qty: {sale.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary text-sm">{formatCurrency(sale.total)}</p>
                        <Badge variant={sale.status === 'completed' ? 'success' : 'warning'} className="text-xs">{sale.status}</Badge>
                      </div>
                    </div>)}
                </div>}
            </TabsContent>

            <TabsContent value="bookings" className="mt-0">
              {farmerBookings.length === 0 ? <p className="text-muted-foreground text-center py-8">No machinery bookings recorded yet.</p> : <div className="space-y-3">
                  {farmerBookings.map(booking => <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{booking.machinery_name || 'Machinery'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={booking.status === 'completed' ? 'success' : 'info'} className="text-xs">{booking.status}</Badge>
                      </div>
                    </div>)}
                </div>}
            </TabsContent>

            <TabsContent value="trainings" className="mt-0">
              {farmerTrainings.length === 0 ? <p className="text-muted-foreground text-center py-8">No trainings attended yet.</p> : <div className="space-y-3">
                  {farmerTrainings.map(training => <div key={training.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{training.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(training.scheduled_date)} • {training.venue || 'No venue'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="forest" className="text-xs">{training.training_type}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{training.duration_hours || 0} hrs</p>
                      </div>
                    </div>)}
                </div>}
            </TabsContent>

            <TabsContent value="visits" className="mt-0">
              {farmerVisits.length === 0 ? <p className="text-muted-foreground text-center py-8">No visits recorded yet.</p> : <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={exportVisitsToCSV}>
                      <Download className="w-4 h-4 mr-1" />
                      Export CSV
                    </Button>
                  </div>
                  {farmerVisits.map(visit => <div key={visit.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="sage" className="text-xs">{visit.purpose}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(visit.date)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{visit.notes}</p>
                      {visit.totName && <p className="text-xs text-muted-foreground mt-2">By: {visit.totName}</p>}
                    </div>)}
                </div>}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>;
}
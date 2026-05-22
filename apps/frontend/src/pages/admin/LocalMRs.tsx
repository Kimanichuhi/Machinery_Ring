import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Users,
  MapPin,
  UserCog,
  Loader2,
  TrendingUp,
  ShoppingCart,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useLocalMRs,
  useCreateLocalMR,
  useUpdateLocalMR,
} from '@/hooks/api/useLocalMRs';
import { useSales } from '@/hooks/api/useSales';
import { useTrainings } from '@/hooks/api/useTrainings';
import { useVisits } from '@/hooks/api/useVisits';
import { useMachineryBookings } from '@/hooks/api/useMachineryBookings';

export function LocalMRs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMR, setSelectedMR] = useState<any>(null);

  // Sub-county/Ward data for Nyandarua County
  const subCountyWards: Record<string, string[]> = {
    'Olkalou': ['Karau', 'Kanjuiri', 'Kaimbaga', 'Mirangine', 'Rurii'],
    'Ol Joro Orok': ['Gathanji', 'Gatimu', 'Weru', 'Charagita'],
    'Ndaragwa': ['Leshau', 'Kiriita', 'Central', 'Shamata'],
    'Kinangop': ['Engineer', 'Gathara', 'North Kinangop', 'Murungaru', 'Njabini', 'Nyakio', 'Magumu', 'Githambi'],
    'Kipipiri': ['Wanjohi', 'Kipipiri', 'Geta', 'Githioro'],
  };

  const [formData, setFormData] = useState({
    name: '',
    region: '',
    subcounty: '',
    ward: '',
  });

  // Get available wards based on selected subcounty
  const availableWards = formData.subcounty ? subCountyWards[formData.subcounty] || [] : [];

  /** ================= API ================= */
  const { data: localMRs = [], isLoading } = useLocalMRs();
  const createMR = useCreateLocalMR();
  const updateMR = useUpdateLocalMR();
  
  // Additional data for performance overview
  const { data: sales = [] } = useSales();
  const { data: trainings = [] } = useTrainings();
  const { data: visits = [] } = useVisits();
  const { data: bookings = [] } = useMachineryBookings();

  /** ================= FILTERS ================= */
  const subcounties = [...new Set(localMRs.map((mr: any) => mr.subcounty).filter(Boolean))];

  const filteredMRs = localMRs.filter((mr: any) => {
    const matchesSearch =
      mr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mr.subcounty || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mr.ward || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mr.county || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  /** ================= HELPERS ================= */
  const resetForm = () => {
    setFormData({
      name: '',
      region: '',
      subcounty: '',
      ward: '',
    });
  };

  const handleSubcountyChange = (value: string) => {
    setFormData({ ...formData, subcounty: value, ward: '' });
  };

  /** ================= ACTIONS ================= */
  const handleAddMR = () => {
    if (!formData.name || !formData.region || !formData.subcounty) {
      toast.error('Please fill all required fields (Name, Region, Sub-County)');
      return;
    }

    createMR.mutate(
      {
        name: formData.name,
        region: formData.region,
        county: 'Nyandarua', // Fixed to Nyandarua
        sub_county: formData.subcounty,
        ward: formData.ward || undefined,
      },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateMR = () => {
    if (!selectedMR) return;

    updateMR.mutate(
      {
        id: selectedMR.id,
        data: {
          name: formData.name,
          region: formData.region,
          county: 'Nyandarua', // Fixed to Nyandarua
          sub_county: formData.subcounty,
          ward: formData.ward,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedMR(null);
          resetForm();
        },
      }
    );
  };

  // View Details navigates to the dedicated details page
  const handleViewDetails = (id: string) => {
    navigate(`/local-mrs/${id}`);
  };

  const handleEditClick = (mr: any) => {
    setSelectedMR(mr);
    setFormData({
      name: mr.name,
      region: mr.region || '',
      subcounty: mr.subcounty || mr.sub_county || '',
      ward: mr.ward || '',
    });
    setIsEditDialogOpen(true);
  };

  /** ================= STATS ================= */
  const totalMRs = localMRs.length;
  const totalTOTs = localMRs.reduce((s: number, m: any) => s + (m.totalTots || 0), 0);
  const totalFarmers = localMRs.reduce((s: number, m: any) => s + (m.totalFarmers || 0), 0);

  // Calculate performance metrics per Local MR
  const mrPerformanceData = localMRs.map((mr: any) => {
    const mrSales = sales.filter((s: any) => s.local_mr_id === mr.id);
    const mrTrainings = trainings.filter((t: any) => t.local_mr_id === mr.id);
    const mrVisits = visits.filter((v: any) => v.local_mr_id === mr.id);
    const mrBookings = bookings.filter((b: any) => b.local_mr_id === mr.id);

    const completedSales = mrSales.length;
    const totalRevenue = mrSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
    const completedTrainings = mrTrainings.filter((t: any) => t.status === 'completed').length;
    const completedBookings = mrBookings.filter((b: any) => b.status === 'completed').length;
    const totalVisits = mrVisits.length;

    return {
      ...mr,
      completedSales,
      totalRevenue,
      completedTrainings,
      completedBookings,
      totalVisits,
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Local MRs…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Local MR Management</h1>
          <p className="text-muted-foreground">Manage local market representatives</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Local MR
        </Button>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Building2} label="Local MRs" value={totalMRs} />
        <Stat icon={MapPin} label="Subcounties" value={subcounties.length} />
        <Stat icon={UserCog} label="TOTs" value={totalTOTs} />
        <Stat icon={Users} label="Farmers" value={totalFarmers.toLocaleString()} />
      </div>

      {/* Tabs for List and Performance */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Local MR List
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance Overview
          </TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Local MRs by name, county, subcounty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* TABLE */}
          <Card>
            <CardHeader>
              <CardTitle>Local MRs ({filteredMRs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Subcounty</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>TOTs</TableHead>
                    <TableHead>Farmers</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMRs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No Local MRs found. Click "Add Local MR" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMRs.map((mr: any) => (
                      <TableRow key={mr.id}>
                        <TableCell className="font-medium">{mr.name}</TableCell>
                        <TableCell>{mr.region}</TableCell>
                        <TableCell>{mr.subcounty || '-'}</TableCell>
                        <TableCell>{mr.ward || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={mr.coordinatorName === 'Unassigned' ? 'secondary' : 'default'}>
                            {mr.coordinatorName}
                          </Badge>
                        </TableCell>
                        <TableCell>{mr.totalTots}</TableCell>
                        <TableCell>{mr.totalFarmers}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(mr.id)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(mr)}>
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local MR Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {mrPerformanceData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No performance data available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local MR</TableHead>
                      <TableHead>Coordinator</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart className="w-4 h-4" />
                          Sales
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Revenue
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          Trainings
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Bookings
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Visits
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mrPerformanceData.map((mr: any) => (
                      <TableRow key={mr.id}>
                        <TableCell className="font-medium">{mr.name}</TableCell>
                        <TableCell>
                          <Badge variant={mr.coordinatorName === 'Unassigned' ? 'secondary' : 'default'}>
                            {mr.coordinatorName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {mr.completedSales}
                        </TableCell>
                        <TableCell className="text-center text-primary font-semibold">
                          KES {(mr.totalRevenue / 1000).toFixed(0)}K
                        </TableCell>
                        <TableCell className="text-center">
                          {mr.completedTrainings}
                        </TableCell>
                        <TableCell className="text-center">
                          {mr.completedBookings}
                        </TableCell>
                        <TableCell className="text-center">
                          {mr.totalVisits}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Local MR</DialogTitle>
            <DialogDescription>
              Create a new local market representative area
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter Local MR name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                placeholder="Enter region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcounty">Sub-County *</Label>
              <Select value={formData.subcounty} onValueChange={handleSubcountyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sub-County" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(subCountyWards).map((sc) => (
                    <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select 
                value={formData.ward} 
                onValueChange={(value) => setFormData({ ...formData, ward: value })}
                disabled={!formData.subcounty}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.subcounty ? "Select Ward" : "Select Sub-County first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableWards.map((ward) => (
                    <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddMR} disabled={createMR.isPending}>
              {createMR.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Local MR'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Local MR</DialogTitle>
            <DialogDescription>
              Update local market representative details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter Local MR name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region">Region *</Label>
              <Input
                id="edit-region"
                placeholder="Enter region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subcounty">Sub-County *</Label>
              <Select value={formData.subcounty} onValueChange={handleSubcountyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sub-County" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(subCountyWards).map((sc) => (
                    <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ward">Ward</Label>
              <Select 
                value={formData.ward} 
                onValueChange={(value) => setFormData({ ...formData, ward: value })}
                disabled={!formData.subcounty}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.subcounty ? "Select Ward" : "Select Sub-County first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableWards.map((ward) => (
                    <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedMR(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMR} disabled={updateMR.isPending}>
              {updateMR.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Local MR'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** SMALL STAT CARD */
function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

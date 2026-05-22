// src/components/forms/VisitFormDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useTotsByLocalMR } from '@/hooks/api/useTotsByLocalMR';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { MapPin, Loader2, AlertCircle, ChevronDown, CalendarIcon } from 'lucide-react';
import { CreateVisitDto } from '@/hooks/api/useVisits';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (visit: CreateVisitDto) => void;
}

const visitPurposes = [
  'Follow-up',
  'Soil Testing',
  'Crop Monitoring',
  'Product Delivery',
  'Training',
  'Group Meeting',
  'Problem Solving',
  'New Registration',
] as const;

export function VisitFormDialog({ open, onOpenChange, onSubmit }: VisitFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    farmerId: '',
    totId: '',
    localMrId: '',
    purposes: [] as string[],
    notes: '',
    followUpRequired: false,
    followUpDate: null as Date | null,
  });

  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);

  const { data: allFarmers = [], isLoading: farmersLoading, error: farmersError } = useFarmers();
  const { data: localMRs = [] } = useLocalMRs();
  const { data: tots = [], isLoading: totsLoading } = useTotsByLocalMR(formData.localMrId);

  // Filter farmers by selected Local MR
  const filteredFarmers = useMemo(() => {
    if (!formData.localMrId) return allFarmers;
    return allFarmers.filter(f => f.local_mr_id === formData.localMrId);
  }, [allFarmers, formData.localMrId]);

  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation not supported');
      return;
    }
    setIsLoadingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLoadingGps(false);
        toast({ title: 'Location Captured' });
      },
      (error) => {
        setGpsError(error.message);
        setIsLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      captureLocation();
      setFormData({
        farmerId: '',
        totId: '',
        localMrId: '',
        purposes: [],
        notes: '',
        followUpRequired: false,
        followUpDate: null,
      });
      setGpsLocation(null);
      setGpsError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Set default local MR when data loads
  const defaultLocalMrSet = React.useRef(false);
  
  useEffect(() => {
    if (open && localMRs.length > 0 && !defaultLocalMrSet.current) {
      defaultLocalMrSet.current = true;
      setFormData(prev => ({ ...prev, localMrId: localMRs[0]?.id || '' }));
    }
    if (!open) {
      defaultLocalMrSet.current = false;
    }
  }, [open, localMRs.length]);

  // Auto-select local MR from selected farmer
  const selectedFarmer = allFarmers.find((f) => f.id === formData.farmerId);
  const selectedFarmerLocalMrId = selectedFarmer?.local_mr_id;

  useEffect(() => {
    if (selectedFarmerLocalMrId) {
      setFormData(prev => {
        if (prev.localMrId !== selectedFarmerLocalMrId) {
          return { ...prev, localMrId: selectedFarmerLocalMrId };
        }
        return prev;
      });
    }
  }, [selectedFarmerLocalMrId]);

  const handlePurposeToggle = (purpose: string) => {
    setFormData(prev => ({
      ...prev,
      purposes: prev.purposes.includes(purpose)
        ? prev.purposes.filter(p => p !== purpose)
        : [...prev.purposes, purpose]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.farmerId || !formData.totId || formData.purposes.length === 0 || !formData.notes.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields (TOT, Farmer, at least one Purpose, and Notes)', variant: 'destructive' });
      return;
    }

    const selectedTot = tots.find(t => t.id === formData.totId);

    // Create visit DTO for Supabase
    const visitData: CreateVisitDto = {
      participant_type: 'farmer',
      farmer_id: formData.farmerId,
      tot_id: formData.totId,
      local_mr_id: formData.localMrId || undefined,
      purpose: formData.purposes.join(', '),
      notes: formData.notes.trim(),
      visit_date: new Date().toISOString(),
      follow_up_required: formData.followUpRequired,
      follow_up_date: formData.followUpDate ? formData.followUpDate.toISOString() : undefined,
    };

    onSubmit(visitData);
    toast({ title: 'Visit Logged', description: `Visit to ${selectedFarmer?.name} by ${selectedTot?.name} recorded` });
    onOpenChange(false);
  };

  const isLoading = farmersLoading || totsLoading;
  const hasError = farmersError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Log Field Visit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 px-1">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {isLoadingGps ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Capturing GPS...</span>
                </>
              ) : gpsLocation ? (
                <>
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Location Captured</p>
                    <p className="text-xs text-muted-foreground">
                      {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </>
              ) : gpsError ? (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{gpsError}</p>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Location not captured</span>
                </>
              )}
              {!isLoadingGps && !gpsLocation && (
                <Button size="sm" variant="ghost" onClick={captureLocation}>
                  Retry
                </Button>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading data...</span>
            </div>
          )}

          {hasError && (
            <div className="text-center py-8 text-destructive">Failed to load data</div>
          )}

          {!isLoading && !hasError && (
            <>
              <div className="space-y-2">
                <Label>Select Local MR *</Label>
                <Select 
                  value={formData.localMrId} 
                  onValueChange={(value) => setFormData({ ...formData, localMrId: value, farmerId: '', totId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Local MR" />
                  </SelectTrigger>
                  <SelectContent>
                    {localMRs.map((mr) => (
                      <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TOT (Who Conducted Visit) *</Label>
                <Select 
                  value={formData.totId} 
                  onValueChange={(value) => setFormData({ ...formData, totId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tots.length === 0 ? 'No TOTs in this MR' : 'Select TOT'} />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-[200px]">
                      {tots.map((tot) => (
                        <SelectItem key={tot.id} value={tot.id}>
                          {tot.name}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Farmer (Who Was Visited) *</Label>
                <Select 
                  value={formData.farmerId} 
                  onValueChange={(value) => setFormData({ ...formData, farmerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredFarmers.length === 0 ? 'No farmers in this MR' : 'Select Farmer'} />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-[200px]">
                      {filteredFarmers.map((farmer) => (
                        <SelectItem key={farmer.id} value={farmer.id}>
                          {farmer.name}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purpose * (select one or more)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        formData.purposes.length === 0 && "text-muted-foreground"
                      )}
                    >
                      {formData.purposes.length > 0
                        ? formData.purposes.length === 1
                          ? formData.purposes[0]
                          : `${formData.purposes.length} purposes selected`
                        : "Select purposes"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                    <ScrollArea className="h-[250px] touch-pan-y">
                      <div className="p-2 space-y-1">
                        {visitPurposes.map((purpose) => (
                          <div
                            key={purpose}
                            className="flex items-center space-x-2 p-3 rounded-md hover:bg-muted cursor-pointer active:bg-muted/80"
                            onClick={() => handlePurposeToggle(purpose)}
                          >
                            <Checkbox
                              checked={formData.purposes.includes(purpose)}
                              onCheckedChange={() => handlePurposeToggle(purpose)}
                            />
                            <span className="text-sm">{purpose}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                {formData.purposes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {formData.purposes.join(', ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes *</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Visit observations..."
                  rows={4}
                  required
                />
              </div>

              {/* Follow-up Section */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="followUpRequired"
                    checked={formData.followUpRequired}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        followUpRequired: checked === true,
                        followUpDate: checked === true ? formData.followUpDate : null
                      })
                    }
                  />
                  <Label htmlFor="followUpRequired" className="cursor-pointer">
                    Schedule a follow-up visit
                  </Label>
                </div>

                {formData.followUpRequired && (
                  <div className="space-y-2 pt-2">
                    <Label>Follow-up Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.followUpDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.followUpDate 
                            ? format(formData.followUpDate, "PPP") 
                            : <span>Pick a follow-up date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.followUpDate || undefined}
                          onSelect={(date) => setFormData({ ...formData, followUpDate: date || null })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="earth"
              className="flex-1"
              disabled={isLoading || !!hasError || filteredFarmers.length === 0 || tots.length === 0}
            >
              Log Visit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
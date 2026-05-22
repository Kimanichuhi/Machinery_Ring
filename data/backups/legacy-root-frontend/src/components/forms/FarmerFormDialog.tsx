// src/components/forms/FarmerFormDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { CreateFarmerDto } from '@/hooks/api/useFarmers';
import { supabase } from '@/integrations/supabase/client';

// Updated farming types per request - removed Coffee, Tea, Sugarcane; added Potato, Barley
const farmingTypes = [
  'Maize',
  'Wheat',
  'Potato',
  'Barley',
  'Dairy',
  'Poultry',
  'Horticulture',
  'Livestock',
  'Mixed Farming',
];

// Sub-Counties and Wards for Nyandarua County
const subCountyWards: Record<string, string[]> = {
  'Olkalou': ['Karau', 'Kanjuiri', 'Kaimbaga', 'Mirangine', 'Rurii'],
  'Ol Joro Orok': ['Gathanji', 'Gatimu', 'Weru', 'Charagita'],
  'Ndaragwa': ['Leshau', 'Kiriita', 'Central', 'Shamata'],
  'Kinangop': ['Engineer', 'Gathara', 'North Kinangop', 'Murungaru', 'Njabini', 'Nyakio', 'Magumu', 'Githambi'],
  'Kipipiri': ['Wanjohi', 'Kipipiri', 'Geta', 'Githioro'],
};

interface FarmerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer?: any | null;
  onSubmit: (farmer: CreateFarmerDto) => void;
}

export function FarmerFormDialog({
  open,
  onOpenChange,
  farmer,
  onSubmit,
}: FarmerFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!farmer;

  const { data: localMRsData, isLoading: mrsLoading, error: mrsError } = useLocalMRs();
  const localMRs = Array.isArray(localMRsData) ? localMRsData : [];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    localMrId: '',
    sub_county: '',
    village: '',
    ward: '',
    farming_type: '',
    gender: '',
    farm_size: '',
  });

  // Get available wards based on selected sub-county
  const availableWards = formData.sub_county ? subCountyWards[formData.sub_county] || [] : [];

  // Reset / populate form when dialog opens or farmer prop changes
  useEffect(() => {
    if (open) {
      if (farmer) {
        setFormData({
          name: farmer.name || '',
          phone: farmer.phone || '',
          email: farmer.email || '',
          localMrId: farmer.local_mr_id || farmer.localMrId || '',
          sub_county: farmer.sub_county || farmer.location?.subcounty || '',
          village: farmer.village || farmer.location?.village || '',
          ward: farmer.ward || farmer.location?.ward || '',
          farming_type: farmer.farming_type || farmer.valueChain || '',
          gender: farmer.gender || '',
          farm_size: farmer.farm_size?.toString() || '',
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          localMrId: localMRs[0]?.id || '',
          sub_county: '',
          village: '',
          ward: '',
          farming_type: '',
          gender: '',
          farm_size: '',
        });
      }
    }
  }, [farmer, open, localMRs]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - County is now fixed to Nyandarua
    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.localMrId ||
      !formData.sub_county
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields (Name, Phone, Sub-County, Local MR)',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate phone number
    if (formData.phone.trim()) {
      setIsSubmitting(true);
      try {
        let query = supabase
          .from('farmers')
          .select('id, name')
          .eq('phone', formData.phone.trim());

        // Exclude current farmer when editing
        if (isEditing && farmer?.id) {
          query = query.neq('id', farmer.id);
        }

        const { data: existing } = await query.limit(1);
        if (existing && existing.length > 0) {
          toast({
            title: 'Duplicate Farmer',
            description: `A farmer with phone "${formData.phone.trim()}" already exists: ${existing[0].name}`,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      } catch {
        // If check fails, let the DB constraint catch it
      }
      setIsSubmitting(false);
    }

    // Create farmer DTO for Supabase - County is fixed to Nyandarua
    const farmerData: CreateFarmerDto = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      county: 'Nyandarua', // Fixed county
      sub_county: formData.sub_county.trim() || undefined,
      ward: formData.ward.trim() || undefined,
      village: formData.village.trim() || undefined,
      farming_type: formData.farming_type || undefined,
      gender: formData.gender || undefined,
      farm_size: formData.farm_size ? parseFloat(formData.farm_size) : undefined,
      local_mr_id: formData.localMrId || undefined,
    };

    onSubmit(farmerData);

    toast({
      title: isEditing ? 'Farmer Updated' : 'Farmer Added',
      description: isEditing
        ? 'Farmer details have been updated.'
        : 'New farmer has been successfully registered.',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Farmer Details' : 'Add New Farmer'}</DialogTitle>
          {isEditing && (
            <DialogDescription className="flex items-start gap-2 text-orange-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Changes require Admin approval.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
          {mrsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading Local MRs...</span>
            </div>
          )}

          {mrsError && (
            <div className="text-center py-8 text-destructive">
              Failed to load Local MRs. Please try again later.
            </div>
          )}

          {!mrsLoading && !mrsError && (
            <>
              {/* Full Name */}
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. James Kiprotich"
                />
              </div>

              {/* Local MR */}
              <div className="space-y-2">
                <Label>Local MR *</Label>
                <Select
                  value={formData.localMrId}
                  onValueChange={(value) => setFormData({ ...formData, localMrId: value })}
                  disabled={localMRs.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={localMRs.length === 0 ? 'No Local MRs available' : 'Select Local MR'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {localMRs.map((mr) => (
                      <SelectItem key={mr.id} value={mr.id}>
                        {mr.name} - {mr.county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+2547XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Gender & Farm Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Farm Size (acres)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.farm_size}
                    onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                    placeholder="e.g. 2.5"
                  />
                </div>
              </div>

              {/* Location Fields - Sub-County with dependent Ward */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sub-County *</Label>
                  <Select
                    value={formData.sub_county}
                    onValueChange={(value) => setFormData({ ...formData, sub_county: value, ward: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Sub-County" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(subCountyWards).map((sc) => (
                        <SelectItem key={sc} value={sc}>
                          {sc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ward</Label>
                  <Select
                    value={formData.ward}
                    onValueChange={(value) => setFormData({ ...formData, ward: value })}
                    disabled={!formData.sub_county}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.sub_county ? "Select Ward" : "Select Sub-County first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWards.map((ward) => (
                        <SelectItem key={ward} value={ward}>
                          {ward}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Village</Label>
                <Input
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="Enter village name"
                />
              </div>

              {/* Farming Type */}
              <div className="space-y-2">
                <Label>Farming Type</Label>
                <Select
                  value={formData.farming_type}
                  onValueChange={(value) => setFormData({ ...formData, farming_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farming type" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmingTypes.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {ft}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isEditing ? 'default' : 'forest'}
              className="flex-1"
              disabled={mrsLoading || !!mrsError || isSubmitting}
            >
              {isSubmitting ? (
                'Checking...'
              ) : isEditing ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Update Farmer
                </>
              ) : (
                'Add Farmer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

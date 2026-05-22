// src/components/forms/TrainingFormDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { useAuth } from '@/contexts/AuthContext';
import { CreateTrainingDto } from '@/hooks/api/useTrainings';

interface TrainingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training?: any | null;
  onSubmit: (training: CreateTrainingDto) => void;
}

// Training types per request - removed Seminars, Online Training
const trainingTypes = ['Field Day', 'Demonstration', 'Workshop'];
const targetGroups = ['Women', 'Youth', 'Other'];

export function TrainingFormDialog({ open, onOpenChange, training, onSubmit }: TrainingFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: localMRs = [] } = useLocalMRs();
  const isEditing = !!training;

  const [formData, setFormData] = useState({
    title: '',
    type: '',
    date: '',
    time: '',
    localMrId: '',
    location: '',
    duration: 2,
    trainer: '', // Text field for trainer name
    description: '',
    targetGroup: '',
    targetGroupOther: '',
  });

  useEffect(() => {
    if (training && open) {
      setFormData({
        title: training.title || '',
        type: training.training_type || training.type || '',
        date: training.scheduled_date ? new Date(training.scheduled_date).toISOString().split('T')[0] : '',
        time: training.scheduled_time || '',
        localMrId: training.local_mr_id || '',
        location: training.venue || training.location || '',
        duration: training.duration_hours || training.duration || 2,
        trainer: training.trainer || '',
        description: training.description || '',
        targetGroup: training.target_group || '',
        targetGroupOther: training.target_group_other || '',
      });
    } else if (!training && open) {
      setFormData({
        title: '',
        type: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        localMrId: localMRs[0]?.id || '',
        location: '',
        duration: 2,
        trainer: '',
        description: '',
        targetGroup: '',
        targetGroupOther: '',
      });
    }
  }, [training, open, localMRs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.type || !formData.date || !formData.location || !formData.trainer) {
      toast({ title: 'Validation Error', description: 'Please fill required fields (Title, Type, Date, Location, Trainer)', variant: 'destructive' });
      return;
    }

    // Create training DTO for Supabase - all trainings are completed by default
    const trainingData: CreateTrainingDto = {
      title: formData.title,
      description: formData.description || undefined,
      training_type: formData.type,
      trainer_id: user?.id || '',
      trainer: formData.trainer, // Store trainer name
      local_mr_id: formData.localMrId || undefined,
      scheduled_date: formData.date,
      scheduled_time: formData.time || undefined,
      duration_hours: formData.duration,
      venue: formData.location,
      status: 'completed', // All trainings are historical/completed
    };

    onSubmit(trainingData);
    toast({ title: isEditing ? 'Training Updated' : 'Training Recorded' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Training' : 'Add Training'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 px-1">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Training title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {trainingTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trainer *</Label>
            <Input
              value={formData.trainer}
              onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
              placeholder="Name of trainer/facilitator"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Local MR</Label>
            <Select value={formData.localMrId} onValueChange={(value) => setFormData({ ...formData, localMrId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select Local MR (optional)" />
              </SelectTrigger>
              <SelectContent>
                {localMRs.map((mr) => (
                  <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (hrs) *</Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location/Venue *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Training venue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Target Group</Label>
            <Select value={formData.targetGroup} onValueChange={(value) => setFormData({ ...formData, targetGroup: value, targetGroupOther: value !== 'Other' ? '' : formData.targetGroupOther })}>
              <SelectTrigger>
                <SelectValue placeholder="Select target group" />
              </SelectTrigger>
              <SelectContent>
                {targetGroups.map((group) => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.targetGroup === 'Other' && (
            <div className="space-y-2">
              <Label>Specify Target Group</Label>
              <Textarea
                value={formData.targetGroupOther}
                onChange={(e) => setFormData({ ...formData, targetGroupOther: e.target.value })}
                placeholder="Describe the target group..."
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description/Topics (comma-separated)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Topics covered..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="forest" className="flex-1">
              {isEditing ? 'Update' : 'Record Training'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

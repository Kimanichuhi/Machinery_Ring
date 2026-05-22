// src/components/admin/CreateUserForm.tsx
import React, { useState } from 'react';
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
import { UserRole } from '@/types';
import { useCreateUser } from '@/hooks/api/useUsers'; // Real mutation hook
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface CreateUserFormProps {
  onSuccess: () => void;
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const { toast } = useToast();
  const createUser = useCreateUser();

  const { data: localMRs = [] } = useLocalMRs();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as UserRole,
    localMrId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.role || !formData.password) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both password fields match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.role !== 'admin' && !formData.localMrId) {
      toast({
        title: 'Local MR Required',
        description: 'Please assign a Local MR for TOT or Manager',
        variant: 'destructive',
      });
      return;
    }

    createUser.mutate(
      {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        localMrId: formData.role === 'admin' ? undefined : formData.localMrId,
        password: formData.password,
      },
      {
        onSuccess: () => {
          toast({
            title: 'User Created Successfully',
            description: `${formData.name} (${formData.role.toUpperCase()}) account is ready`,
          });

          // Reset form
          setFormData({
            name: '',
            email: '',
            phone: '',
            role: '' as UserRole,
            localMrId: '',
            password: '',
            confirmPassword: '',
          });

          onSuccess();
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to Create User',
            description: error.message || 'Please try again',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. John Kamau"
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john.kamau@machineryring.ke"
          required
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+254712345678"
          required
        />
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label>Role *</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as UserRole, localMrId: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select user role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tot">TOT (Technical Officer)</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin (use cautiously)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Local MR (only for TOT/Manager) */}
      {formData.role && formData.role !== 'admin' && (
        <div className="space-y-2">
          <Label>Assign Local MR *</Label>
          <Select
            value={formData.localMrId}
            onValueChange={(value) => setFormData({ ...formData, localMrId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Local MR" />
            </SelectTrigger>
            <SelectContent>
              {localMRs.map((mr) => (
                <SelectItem key={mr.id} value={mr.id}>
                  {mr.name} ({mr.code || mr.region})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Minimum 8 characters. User will be prompted to change on first login.
        </p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        variant="forest"
        disabled={createUser.isPending}
      >
        {createUser.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating User...
          </>
        ) : (
          'Create User Account'
        )}
      </Button>
    </form>
  );
}

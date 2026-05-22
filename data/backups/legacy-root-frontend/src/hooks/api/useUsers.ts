// src/hooks/api/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // From user_roles
  role: string;
  // From tot_assignments
  local_mr_id?: string;
  local_mr_name?: string;
  localMrId?: string;
  localMrName?: string;
  // Performance metrics
  salesCount?: number;
  totalRevenue?: number;
  totalCommission?: number;
  jobsCount?: number;
  completedJobsCount?: number;
  trainingsCount?: number;
  completedTrainingsCount?: number;
  visitsCount?: number;
  lastActivityDate?: string | null;
}

export interface UserFilters {
  role?: string;
  localMrId?: string;
  status?: string;
  search?: string;
}

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters = {}) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch TOT assignments for local_mr mapping
      const { data: assignments, error: assignmentsError } = await supabase
        .from('tot_assignments')
        .select(`
          tot_id,
          local_mr_id,
          local_mrs!tot_assignments_local_mr_id_fkey(name)
        `)
        .eq('status', 'active');

      if (assignmentsError) throw assignmentsError;

      // Fetch sales data for performance metrics
      const { data: sales } = await supabase
        .from('sales')
        .select('tot_id, total_amount, commission_amount, sale_date');

      // Fetch mechanisation jobs for metrics
      const { data: jobs } = await supabase
        .from('mechanisation_jobs')
        .select('tot_id, status, scheduled_date');

      // Fetch trainings for metrics
      const { data: trainings } = await supabase
        .from('trainings')
        .select('trainer_id, status, scheduled_date');

      // Fetch visits for metrics
      const { data: visits } = await supabase
        .from('visits')
        .select('tot_id, visit_date');

      // Build maps for quick lookup
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const assignmentsMap = new Map(
        assignments?.map(a => [a.tot_id, { local_mr_id: a.local_mr_id, local_mr_name: a.local_mrs?.name }]) || []
      );

      // Aggregate sales metrics per user
      const salesMap = new Map<string, { count: number; revenue: number; commission: number; lastDate: string | null }>();
      (sales || []).forEach((s) => {
        const existing = salesMap.get(s.tot_id) || { count: 0, revenue: 0, commission: 0, lastDate: null };
        existing.count += 1;
        existing.revenue += Number(s.total_amount) || 0;
        existing.commission += Number(s.commission_amount) || 0;
        if (!existing.lastDate || s.sale_date > existing.lastDate) {
          existing.lastDate = s.sale_date;
        }
        salesMap.set(s.tot_id, existing);
      });

      // Aggregate jobs per user
      const jobsMap = new Map<string, { count: number; completedCount: number; lastDate: string | null }>();
      (jobs || []).forEach((j) => {
        const existing = jobsMap.get(j.tot_id) || { count: 0, completedCount: 0, lastDate: null };
        existing.count += 1;
        if (j.status === 'completed') existing.completedCount += 1;
        if (!existing.lastDate || j.scheduled_date > existing.lastDate) {
          existing.lastDate = j.scheduled_date;
        }
        jobsMap.set(j.tot_id, existing);
      });

      // Aggregate trainings per user (trainer_id)
      const trainingsMap = new Map<string, { count: number; completedCount: number; lastDate: string | null }>();
      (trainings || []).forEach((t) => {
        const existing = trainingsMap.get(t.trainer_id) || { count: 0, completedCount: 0, lastDate: null };
        existing.count += 1;
        if (t.status === 'completed') existing.completedCount += 1;
        if (!existing.lastDate || t.scheduled_date > existing.lastDate) {
          existing.lastDate = t.scheduled_date;
        }
        trainingsMap.set(t.trainer_id, existing);
      });

      // Aggregate visits per user
      const visitsMap = new Map<string, { count: number; lastDate: string | null }>();
      (visits || []).forEach((v) => {
        const existing = visitsMap.get(v.tot_id) || { count: 0, lastDate: null };
        existing.count += 1;
        if (!existing.lastDate || v.visit_date > existing.lastDate) {
          existing.lastDate = v.visit_date;
        }
        visitsMap.set(v.tot_id, existing);
      });

      // Build user list with roles, assignments, and performance metrics
      let users = (profiles || []).map(p => {
        const salesData = salesMap.get(p.id);
        const jobsData = jobsMap.get(p.id);
        const trainingsData = trainingsMap.get(p.id);
        const visitsData = visitsMap.get(p.id);

        // Calculate last activity date
        const activityDates = [
          salesData?.lastDate,
          jobsData?.lastDate,
          trainingsData?.lastDate,
          visitsData?.lastDate,
        ].filter(Boolean) as string[];
        
        const lastActivityDate = activityDates.length > 0
          ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null;

        return {
          ...p,
          role: rolesMap.get(p.id) || 'tot',
          local_mr_id: assignmentsMap.get(p.id)?.local_mr_id,
          local_mr_name: assignmentsMap.get(p.id)?.local_mr_name,
          localMrId: assignmentsMap.get(p.id)?.local_mr_id,
          localMrName: assignmentsMap.get(p.id)?.local_mr_name,
          // Performance metrics
          salesCount: salesData?.count || 0,
          totalRevenue: salesData?.revenue || 0,
          totalCommission: salesData?.commission || 0,
          jobsCount: jobsData?.count || 0,
          completedJobsCount: jobsData?.completedCount || 0,
          trainingsCount: trainingsData?.count || 0,
          completedTrainingsCount: trainingsData?.completedCount || 0,
          visitsCount: visitsData?.count || 0,
          lastActivityDate,
        };
      });

      // Apply filters
      if (filters.role) {
        users = users.filter(u => u.role === filters.role);
      }
      if (filters.localMrId) {
        users = users.filter(u => u.local_mr_id === filters.localMrId);
      }
      if (filters.status) {
        users = users.filter(u => u.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        users = users.filter(u => 
          u.name.toLowerCase().includes(search) || 
          u.email.toLowerCase().includes(search)
        );
      }

      return users;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .single();

      const { data: assignment } = await supabase
        .from('tot_assignments')
        .select(`
          local_mr_id,
          local_mrs!tot_assignments_local_mr_id_fkey(name)
        `)
        .eq('tot_id', id)
        .eq('status', 'active')
        .single();

      return {
        ...profile,
        role: roleData?.role || 'tot',
        local_mr_id: assignment?.local_mr_id,
        local_mr_name: assignment?.local_mrs?.name,
        localMrId: assignment?.local_mr_id,
      };
    },
    enabled: !!id,
  });
}

export interface CreateUserDto {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  localMrId?: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call edge function to create user (uses admin API)
      const response = await supabase.functions.invoke('create-user', {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
          localMrId: data.localMrId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error: Error) => {
      console.error('Create user error:', error);
    },
  });
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  localMrId?: string;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      // Update profile
      const profileUpdate: any = {};
      if (data.name) profileUpdate.name = data.name;
      if (data.email) profileUpdate.email = data.email;
      if (data.phone !== undefined) profileUpdate.phone = data.phone;
      if (data.status) profileUpdate.status = data.status;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', id);

        if (profileError) throw profileError;
      }

      // Update role if changed
      if (data.role) {
        // Delete existing role and insert new one (avoids upsert constraint issues)
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: id,
            role: data.role as any,
          });

        if (roleError) throw roleError;
      }

      // Always update local MR assignment when editing a user
      // First delete all existing assignments for this user
      await supabase
        .from('tot_assignments')
        .delete()
        .eq('tot_id', id);

      // Add new assignment if localMrId is provided and role requires it
      if (data.localMrId && data.role !== 'admin' && data.role !== 'manager') {
        const { error: assignmentError } = await supabase
          .from('tot_assignments')
          .insert({
            tot_id: id,
            local_mr_id: data.localMrId,
            status: 'active',
          });

        if (assignmentError) throw assignmentError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call edge function to delete user from auth (cascades to profiles and related tables)
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`User ${variables.status === 'active' ? 'activated' : 'deactivated'}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

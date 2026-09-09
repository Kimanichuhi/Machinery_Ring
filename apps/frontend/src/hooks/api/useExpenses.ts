// src/hooks/api/useExpenses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  vendor: string | null;
  local_mr_id: string | null;
  recorded_by: string;
  status: 'recorded' | 'voided';
  notes: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
  // Joined
  local_mr_name?: string;
  recorded_by_name?: string;
}

export interface ExpenseFilters {
  category?: string;
  localMrId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: ExpenseFilters = {}) => [...expenseKeys.lists(), filters] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
};

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('expense_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('expense_date', filters.endDate);
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,vendor.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      const localMrIds = [...new Set((data || []).map((e) => e.local_mr_id).filter((x): x is string => !!x))];
      const recordedByIds = [...new Set((data || []).map((e) => e.recorded_by).filter((x): x is string => !!x))];

      const [localMrsRes, recordersRes] = await Promise.all([
        localMrIds.length > 0 ? supabase.from('local_mrs').select('id, name').in('id', localMrIds) : { data: [] },
        recordedByIds.length > 0 ? supabase.from('profiles').select('id, name').in('id', recordedByIds) : { data: [] },
      ]);

      const localMrsMap = (localMrsRes.data || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {} as Record<string, string>);
      const recordersMap = (recordersRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<string, string>);

      return (data || []).map((expense) => ({
        ...expense,
        local_mr_name: expense.local_mr_id ? localMrsMap[expense.local_mr_id] || '' : '',
        recorded_by_name: recordersMap[expense.recorded_by] || '',
      })) as Expense[];
    },
    staleTime: STALE_TIME.STANDARD,
  });
}

export interface CreateExpenseDto {
  category: string;
  description: string;
  amount: number;
  payment_method?: string;
  vendor?: string;
  local_mr_id?: string | null;
  notes?: string;
  expense_date?: string;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseDto) => {
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          category: data.category,
          description: data.description,
          amount: data.amount,
          local_mr_id: data.local_mr_id || null,
          ...(data.payment_method ? { payment_method: data.payment_method } : {}),
          ...(data.vendor ? { vendor: data.vendor } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          ...(data.expense_date ? { expense_date: data.expense_date } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record expense');
    },
  });
}

export interface UpdateExpenseDto {
  category?: string;
  description?: string;
  amount?: number;
  payment_method?: string;
  vendor?: string | null;
  local_mr_id?: string | null;
  notes?: string | null;
  expense_date?: string;
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateExpenseDto }) => {
      const payload: Record<string, unknown> = {};
      if (updates.category) payload.category = updates.category;
      if (updates.description) payload.description = updates.description;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.payment_method) payload.payment_method = updates.payment_method;
      if (updates.vendor !== undefined) payload.vendor = updates.vendor || null;
      if (updates.local_mr_id !== undefined) payload.local_mr_id = updates.local_mr_id || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      if (updates.expense_date) payload.expense_date = updates.expense_date;

      const { error } = await supabase.from('expenses').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update expense');
    },
  });
}

export function useVoidExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').update({ status: 'voided' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense voided');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to void expense');
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('status', 'voided');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete expense');
    },
  });
}

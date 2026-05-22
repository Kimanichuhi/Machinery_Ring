// src/hooks/api/useSales.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Sale {
  id: string;
  farmer_id: string;
  product_id: string;
  tot_id: string;
  local_mr_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_per_unit: number;
  commission_amount: number;
  commission_paid: boolean;
  commission_paid_at: string | null;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  delivery_note_number: string | null;
  sale_date: string;
  created_at: string;
  updated_at: string;
  // Joined
  farmer_name?: string;
  product_name?: string;
  tot_name?: string;
  local_mr_name?: string;
}

export interface SaleFilters {
  localMrId?: string;
  totId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  deliveryNoteNumber?: string;
}

export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (filters: SaleFilters = {}) => [...saleKeys.lists(), filters] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
};

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: saleKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.totId) {
        query = query.eq('tot_id', filters.totId);
      }
      if (filters.status) {
        query = query.eq('payment_status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }
      if (filters.deliveryNoteNumber) {
        query = query.ilike('delivery_note_number', `%${filters.deliveryNoteNumber}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sales:', error);
        throw error;
      }

      // Get unique IDs (filter out nulls)
      const farmerIds = [...new Set((data || []).map(s => s.farmer_id).filter((x): x is string => !!x))];
      const productIds = [...new Set((data || []).map(s => s.product_id).filter((x): x is string => !!x))];
      const localMrIds = [...new Set((data || []).map(s => s.local_mr_id).filter((x): x is string => !!x))];
      const totIds = [...new Set((data || []).map(s => s.tot_id).filter((x): x is string => !!x))];

      // Fetch names in parallel
      const [farmersRes, productsRes, localMrsRes, totsRes] = await Promise.all([
        farmerIds.length > 0 ? supabase.from('farmers').select('id, name').in('id', farmerIds) : { data: [] },
        productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [] },
        localMrIds.length > 0 ? supabase.from('local_mrs').select('id, name').in('id', localMrIds) : { data: [] },
        totIds.length > 0 ? supabase.from('profiles').select('id, name').in('id', totIds) : { data: [] },
      ]);

      const farmersMap = (farmersRes.data || []).reduce((acc, f) => { acc[f.id] = f.name; return acc; }, {} as Record<string, string>);
      const productsMap = (productsRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<string, string>);
      const localMrsMap = (localMrsRes.data || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {} as Record<string, string>);
      const totsMap = (totsRes.data || []).reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {} as Record<string, string>);

      return (data || []).map((s: any) => ({
        ...s,
        farmerName: s.farmer_id ? (farmersMap[s.farmer_id] || '') : 'Walk-in',
        productName: productsMap[s.product_id] || '',
        localMrName: localMrsMap[s.local_mr_id] || '',
        totName: totsMap[s.tot_id] || '',
        farmerId: s.farmer_id,
        productId: s.product_id,
        totId: s.tot_id,
        localMrId: s.local_mr_id,
        total: s.total_amount,
        commissionAmount: s.commission_amount,
        profitAmount: Number(s.profit_amount) || 0,
        totCommission: Number(s.tot_commission) || 0,
        regionalMrCommission: Number(s.regional_mr_commission) || 0,
        localMrCommission: Number(s.local_mr_commission) || 0,
        status: s.payment_status,
        date: s.sale_date,
        deliveryNoteNumber: s.delivery_note_number || '',
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch related data
      const [farmerRes, productRes, localMrRes, totRes] = await Promise.all([
        data.farmer_id ? supabase.from('farmers').select('name').eq('id', data.farmer_id).single() : Promise.resolve({ data: null }),
        supabase.from('products').select('name').eq('id', data.product_id).single(),
        supabase.from('local_mrs').select('name').eq('id', data.local_mr_id).single(),
        supabase.from('profiles').select('name').eq('id', data.tot_id).single(),
      ]);

      return {
        ...data,
        farmerName: farmerRes.data?.name || '',
        productName: productRes.data?.name || '',
        localMrName: localMrRes.data?.name || '',
        totName: totRes.data?.name || '',
        total: data.total_amount,
        commissionAmount: data.commission_amount,
        status: data.payment_status,
        date: data.sale_date,
      };
    },
    enabled: !!id,
  });
}

export interface CreateSaleDto {
  farmer_id?: string | null;
  product_id: string;
  tot_id: string;
  local_mr_id: string;
  quantity: number;
  sale_date?: string;
  payment_method?: string;
  notes?: string;
  delivery_note_number?: string;
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSaleDto) => {
      // The database trigger handles commission calculation
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          farmer_id: data.farmer_id || null,
          product_id: data.product_id,
          tot_id: data.tot_id,
          local_mr_id: data.local_mr_id,
          quantity: data.quantity,
          ...(data.sale_date ? { sale_date: data.sale_date } : {}),
          ...(data.payment_method ? { payment_method: data.payment_method } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          ...(data.delivery_note_number ? { delivery_note_number: data.delivery_note_number } : {}),
          // These will be calculated by the trigger
          unit_price: 0,
          total_amount: 0,
          commission_per_unit: 0,
          commission_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Sale recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create sale');
    },
  });
}

export function useBulkCreateSales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sales: CreateSaleDto[]) => {
      const insertData = sales.map(s => ({
        farmer_id: s.farmer_id || null,
        product_id: s.product_id,
        tot_id: s.tot_id,
        local_mr_id: s.local_mr_id,
        quantity: s.quantity,
        ...(s.sale_date ? { sale_date: s.sale_date } : {}),
        ...(s.payment_method ? { payment_method: s.payment_method } : {}),
        ...(s.notes ? { notes: s.notes } : {}),
        ...(s.delivery_note_number ? { delivery_note_number: s.delivery_note_number } : {}),
        unit_price: 0,
        total_amount: 0,
        commission_per_unit: 0,
        commission_amount: 0,
      }));

      const { data, error } = await supabase
        .from('sales')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      toast.success(`${data.length} sales recorded successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to bulk create sales');
    },
  });
}

export function useCompleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .update({ payment_status: 'completed' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Sale completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete sale');
    },
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('sales')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Sale cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel sale');
    },
  });
}

export interface UpdateSaleDto {
  farmer_id?: string | null;
  sale_date?: string;
  payment_method?: string;
  notes?: string | null;
  delivery_note_number?: string | null;
  quantity?: number;
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSaleDto }) => {
      const payload: Record<string, unknown> = {};
      if (updates.farmer_id !== undefined) payload.farmer_id = updates.farmer_id || null;
      if (updates.sale_date) payload.sale_date = updates.sale_date;
      if (updates.payment_method) payload.payment_method = updates.payment_method;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      if (updates.delivery_note_number !== undefined) payload.delivery_note_number = updates.delivery_note_number || null;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;

      const { error } = await supabase.from('sales').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Sale updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update sale');
    },
  });
}

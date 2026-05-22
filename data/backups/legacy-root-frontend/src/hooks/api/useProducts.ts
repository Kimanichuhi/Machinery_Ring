// src/hooks/api/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to create notifications for admins and managers
async function createProductNotification(productName: string, action: 'created' | 'updated' | 'deleted') {
  try {
    // Get all admin and manager user IDs
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);
    
    if (!roleData || roleData.length === 0) return;

    const notifications = roleData.map(r => ({
      user_id: r.user_id,
      type: 'system',
      title: `Product ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Product "${productName}" has been ${action} in the catalog.`,
      read: false,
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Failed to create product notification:', error);
  }
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  unit: string;
  unit_price: number;
  buying_price: number;
  selling_price: number;
  commission_per_unit: number;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  category?: string;
  status?: string;
  search?: string;
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters = {}) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('name');

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => {
        const buying = Number(p.buying_price) || 0;
        const selling = Number(p.selling_price) || Number(p.unit_price) || 0;
        const profitPerUnit = Math.max(selling - buying, 0);
        return {
          ...p,
          buying_price: buying,
          selling_price: selling,
          // Legacy format
          sku: p.id.slice(0, 8).toUpperCase(),
          unitPrice: selling,
          buyingPrice: buying,
          sellingPrice: selling,
          profitPerUnit,
          commission: Math.round(profitPerUnit * 0.4 * 100) / 100, // TOT share for display
          inStock: p.stock_quantity,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        sku: data.id.slice(0, 8).toUpperCase(),
        unitPrice: data.unit_price,
        commission: data.commission_per_unit,
        inStock: data.stock_quantity,
      };
    },
    enabled: !!id,
  });
}

export interface CreateProductDto {
  name: string;
  category: string;
  description?: string;
  unit?: string;
  buying_price: number;
  selling_price: number;
  unit_price?: number;
  commission_per_unit?: number;
  stock_quantity?: number;
  min_stock_level?: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDto) => {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          category: data.category,
          description: data.description,
          unit: data.unit || 'kg',
          buying_price: data.buying_price,
          selling_price: data.selling_price,
          unit_price: data.selling_price, // mirror for legacy
          commission_per_unit: 0,
          stock_quantity: data.stock_quantity || 0,
          min_stock_level: data.min_stock_level || 10,
        })
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      await queryClient.refetchQueries({ queryKey: productKeys.all });
      await createProductNotification(product.name, 'created');
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductDto> }) => {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.category) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.unit) updateData.unit = data.unit;
      if (data.buying_price !== undefined) updateData.buying_price = data.buying_price;
      if (data.selling_price !== undefined) {
        updateData.selling_price = data.selling_price;
        updateData.unit_price = data.selling_price;
      }
      if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
      if (data.min_stock_level !== undefined) updateData.min_stock_level = data.min_stock_level;

      const { data: product, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      await queryClient.refetchQueries({ queryKey: productKeys.all });
      // Create notification for admins and managers
      await createProductNotification(product.name, 'updated');
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: stock })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Stock updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stock');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

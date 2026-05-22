// src/hooks/api/index.ts
export * from './useFarmersAndTots';
// API Hooks - Re-export all hooks for easy importing

// Core entities
export * from './useFarmers';
export * from './useFarmerTrainings';
export { useSales, useSale, useCreateSale, useBulkCreateSales, useCompleteSale, useCancelSale, useUpdateSale, saleKeys } from './useSales';
export * from './useTrainings';
export * from './useVisits';
export { useMachinery, useMachineryItem, useCreateMachinery, useBulkCreateMachinery, useUpdateMachinery, useDeleteMachinery, useUpdateMachineryStatus, machineryKeys } from './useMachinery';
export * from './useMachineryBookings';
export * from './useMachineryService';
export * from './useLocalMRs';
export { useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus, userKeys } from './useUsers';
export * from './useNotifications';

// Dashboard hooks (note: useProductPerformance is also in useDashboard)
export { 
  useAdminDashboard, 
  useManagerDashboard, 
  useTotDashboard, 
  useMonthlySalesData, 
  useTopPerformers,
  useProductPerformance as useDashboardProductPerformance 
} from './useDashboard';

// Products - export all except useProductPerformance to avoid conflict
export { 
  useProducts, 
  useProduct, 
  useCreateProduct, 
  useUpdateProduct, 
  useUpdateProductStock, 
  useDeleteProduct,
  productKeys 
} from './useProducts';

// Real-time subscriptions
export { useProductsRealtime } from './useProductsRealtime';
export { useDashboardRealtime, useFarmersRealtime } from './useDashboardRealtime';

// Overdue follow-ups
export { useOverdueFollowUps } from './useOverdueFollowUps';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface CommissionData {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  salesCount: number;
  paidSalesCount: number;
  pendingSalesCount: number;
}

function useCommissionSummary(totId: string) {
  return useQuery<CommissionData>({
    queryKey: ['commission-summary', totId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('commission_amount, commission_paid')
        .eq('tot_id', totId);

      if (error) throw error;

      const sales = data || [];
      const totalEarned = sales.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0);
      const paidSales = sales.filter(s => s.commission_paid);
      const pendingSales = sales.filter(s => !s.commission_paid);
      const totalPaid = paidSales.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0);
      const totalPending = pendingSales.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0);

      return {
        totalEarned,
        totalPaid,
        totalPending,
        salesCount: sales.length,
        paidSalesCount: paidSales.length,
        pendingSalesCount: pendingSales.length,
      };
    },
    enabled: !!totId,
    staleTime: 1000 * 60 * 3,
  });
}

const formatKES = (value: number) => {
  if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `KES ${(value / 1000).toFixed(1)}K`;
  return `KES ${value.toFixed(0)}`;
};

export function CommissionSummary() {
  const { user } = useAuth();
  const { data, isLoading } = useCommissionSummary(user?.id || '');

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Commission Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { totalEarned = 0, totalPaid = 0, totalPending = 0, salesCount = 0, paidSalesCount = 0, pendingSalesCount = 0 } = data || {};
  const paidPercent = totalEarned > 0 ? (totalPaid / totalEarned) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          Commission Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total earned */}
        <div className="text-center pb-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-foreground">{formatKES(totalEarned)}</p>
          <p className="text-xs text-muted-foreground">{salesCount} sale{salesCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Payment progress</span>
            <span>{paidPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>

        {/* Paid vs Pending */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-sm font-semibold text-foreground">{formatKES(totalPaid)}</p>
              <p className="text-[10px] text-muted-foreground">{paidSalesCount} sale{paidSalesCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-sm font-semibold text-foreground">{formatKES(totalPending)}</p>
              <p className="text-[10px] text-muted-foreground">{pendingSalesCount} sale{pendingSalesCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

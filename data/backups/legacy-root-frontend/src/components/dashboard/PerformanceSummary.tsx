import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendItem {
  label: string;
  current: number;
  previous: number;
  format?: 'number' | 'currency';
}

function formatValue(value: number, format: 'number' | 'currency' = 'number') {
  if (format === 'currency') {
    if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `KES ${(value / 1000).toFixed(0)}K`;
    return `KES ${value.toFixed(0)}`;
  }
  return value.toLocaleString();
}

function TrendRow({ label, current, previous, format = 'number' }: TrendItem) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {formatValue(current, format)}
        </span>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${
          isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-red-500'
        }`}>
          {isNeutral ? (
            <Minus className="w-3 h-3" />
          ) : isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(change).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['performance-summary-trends'],
    queryFn: async () => {
      const { data: trends, error } = await supabase.rpc('get_monthly_trends');
      if (error) throw error;
      return trends || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const currentMonth = data?.[0];
  const previousMonth = data?.[1];

  const items: TrendItem[] = [
    { label: 'Sales', current: currentMonth?.sales_count || 0, previous: previousMonth?.sales_count || 0 },
    { label: 'Revenue', current: currentMonth?.revenue || 0, previous: previousMonth?.revenue || 0, format: 'currency' },
    { label: 'Commission', current: currentMonth?.commission || 0, previous: previousMonth?.commission || 0, format: 'currency' },
    { label: 'New Farmers', current: currentMonth?.farmers || 0, previous: previousMonth?.farmers || 0 },
    { label: 'Active TOTs', current: currentMonth?.tots || 0, previous: previousMonth?.tots || 0 },
  ];

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Performance Summary</h3>
      <p className="text-xs text-muted-foreground mb-3">This month vs last month</p>
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map(item => <TrendRow key={item.label} {...item} />)}
        </div>
      )}
    </Card>
  );
}

// src/components/dashboard/TopPerformers.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { useTopPerformers } from '@/hooks/api/useDashboard';

interface Performer {
  id: string;
  name: string;
  metric: string;
  value: string;
  rank: number;
}

export function TopPerformers({ type = 'tots' }: { type?: 'tots' | 'farmers' }) {
  const { data: response, isLoading, error } = useTopPerformers(type);
  
  const performers: Performer[] = response || [];
  const title = type === 'tots' ? 'Top TOTs This Month' : 'Most Active Farmers';

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-100 text-amber-700';
      case 2:
        return 'bg-slate-100 text-slate-700';
      case 3:
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-7 w-24 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || performers.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-orange-500" />
          <p className="text-sm">
            {error ? 'Failed to load data' : 'No data available yet. Check back later!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="w-5 h-5 text-accent" />
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.slice(0, 5).map((performer, index) => (
            <div
              key={performer.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 animate-fade-in transition-all hover:bg-muted/80"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getRankColor(
                  performer.rank
                )}`}
              >
                {performer.rank}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{performer.name}</p>
                <p className="text-xs text-muted-foreground">{performer.metric}</p>
              </div>
              <Badge variant="forest" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {performer.value}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { AlertCircle, Inbox, LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

/**
 * Shared list-page states so every page that fetches a collection (Farmers,
 * Sales, Machinery, Products, Visits, Trainings, ...) handles loading,
 * error, and empty results the same way instead of each hand-rolling its
 * own layout or silently dropping query errors.
 */

interface PageSkeletonProps {
  /** Number of stat cards to render in the summary row. Set to 0 to omit it. */
  statCards?: number;
}

export function PageSkeleton({ statCards = 4 }: PageSkeletonProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {statCards > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: statCards }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      <Skeleton className="h-64" />
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Failed to load data. Please try again.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 mb-4 text-muted-foreground" />
      <p className="text-muted-foreground font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

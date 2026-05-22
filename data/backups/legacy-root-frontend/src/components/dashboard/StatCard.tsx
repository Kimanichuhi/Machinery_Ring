// src/components/StatCard.tsx
import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'forest' | 'earth' | 'wheat' | 'sage';
  href?: string;
}
const variantStyles = {
  default: 'bg-card',
  forest: 'bg-primary text-primary-foreground',
  earth: 'bg-secondary text-secondary-foreground',
  wheat: 'bg-accent text-accent-foreground',
  sage: 'bg-muted'
} as const;
const iconContainerStyles = {
  default: 'bg-primary/10 text-primary',
  forest: 'bg-primary-foreground/20 text-primary-foreground',
  earth: 'bg-secondary-foreground/20 text-secondary-foreground',
  wheat: 'bg-accent-foreground/20 text-accent-foreground',
  sage: 'bg-primary/10 text-primary'
} as const;
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  href
}: StatCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };
  return <Card className={cn('p-6 transition-shadow duration-150 hover:shadow-card animate-fade-in', variantStyles[variant], href && 'cursor-pointer')} onClick={handleClick}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn('text-sm font-medium', variant === 'default' ? 'text-muted-foreground' : 'opacity-80')}>
            {title}
          </p>
          <p className="font-heading text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className={cn('text-xs', variant === 'default' ? 'text-muted-foreground' : 'opacity-70')}>
              {subtitle}
            </p>}
          {trend && (
            <p className={cn('text-xs font-medium', trend.isPositive ? 'text-primary' : 'text-destructive', variant !== 'default' && 'opacity-90')}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconContainerStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>;
}

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

interface MobileCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCard({ 
  children, 
  className, 
  expandable = false,
  defaultExpanded = false 
}: MobileCardProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (!expandable) {
    return (
      <div className={cn(
        'bg-card rounded-2xl border border-border shadow-soft p-4',
        className
      )}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-card rounded-2xl border border-border shadow-soft overflow-hidden',
      className
    )}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === MobileCardHeader) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => setExpanded(!expanded),
              expanded,
            });
          }
          if (child.type === MobileCardContent) {
            return expanded ? child : null;
          }
        }
        return child;
      })}
    </div>
  );
}

export function MobileCardHeader({ 
  children, 
  className,
  ...props
}: MobileCardHeaderProps & { onClick?: () => void; expanded?: boolean }) {
  const { onClick, expanded } = props as any;

  return (
    <div 
      className={cn(
        'p-4 flex items-center justify-between cursor-pointer',
        onClick && 'hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex-1">{children}</div>
      {onClick !== undefined && (
        <ChevronDown 
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} 
        />
      )}
    </div>
  );
}

export function MobileCardContent({ children, className }: MobileCardContentProps) {
  return (
    <div className={cn('px-4 pb-4 border-t border-border pt-4', className)}>
      {children}
    </div>
  );
}

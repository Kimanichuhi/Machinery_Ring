import * as React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card-style layout
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <div
            key={keyExtractor(item)}
            className={cn(
              'bg-muted/50 rounded-xl p-4 space-y-2 animate-fade-in',
              onRowClick && 'cursor-pointer hover:bg-muted transition-colors'
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => onRowClick?.(item)}
          >
            {columns.map((column) => {
              const value = column.render 
                ? column.render(item) 
                : item[column.key as keyof T];
              
              return (
                <div key={String(column.key)} className="flex justify-between items-start gap-2">
                  <span className="text-sm text-muted-foreground">
                    {column.mobileLabel || column.header}
                  </span>
                  <span className="text-sm font-medium text-right">{value}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Traditional table
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns
              .filter(col => !col.hideOnMobile)
              .map((column) => (
                <th
                  key={String(column.key)}
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                'border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in',
                onRowClick && 'cursor-pointer'
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => onRowClick?.(item)}
            >
              {columns
                .filter(col => !col.hideOnMobile)
                .map((column) => {
                  const value = column.render 
                    ? column.render(item) 
                    : item[column.key as keyof T];
                  
                  return (
                    <td key={String(column.key)} className="py-3 px-4 text-sm">
                      {value}
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

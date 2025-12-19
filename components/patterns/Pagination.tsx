import React from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/components/ui/cn';
import { Typography } from '@/components/ui/Typography';

export type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizes?: number[];
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  className?: string;
};

export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizes = [10, 25, 50],
  onChangePage,
  onChangePageSize,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  return (
    <View className={cn('border-t border-border px-6 py-3 bg-surface flex-row items-center justify-between', className)}>
      <View className="flex-row items-center gap-2">
        <Typography className="text-sm" color="muted">
          Rows per page:
        </Typography>
        {pageSizes.map((size) => {
          const active = pageSize === size;
          return (
            <Pressable
              key={size}
              accessibilityRole="button"
              onPress={() => {
                onChangePageSize(size);
                onChangePage(1);
              }}
              className={cn(
                'px-2 py-1 rounded-md border',
                active ? 'bg-primary border-primary' : 'bg-card border-border'
              )}>
              <Typography className={cn('text-sm', active ? 'text-white font-semibold' : 'text-foreground')}>
                {String(size)}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <View className="items-center">
        <Typography className="text-sm" color="muted">
          Page {pageSafe} of {totalPages}
        </Typography>
        <Typography className="text-xs mt-1" color="muted">
          Showing <Typography className="font-medium text-foreground">{String(totalItems)}</Typography> records
        </Typography>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          disabled={pageSafe <= 1}
          onPress={() => onChangePage(Math.max(1, pageSafe - 1))}
          className={cn(
            'px-3 py-1 border border-border bg-card rounded',
            pageSafe <= 1 ? 'opacity-60' : null
          )}>
          <Typography className={cn('text-sm', pageSafe <= 1 ? 'text-muted-foreground' : 'text-muted')}>
            Previous
          </Typography>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={pageSafe >= totalPages}
          onPress={() => onChangePage(Math.min(totalPages, pageSafe + 1))}
          className={cn(
            'px-3 py-1 border border-border bg-card rounded',
            pageSafe >= totalPages ? 'opacity-60' : null
          )}>
          <Typography className={cn('text-sm', pageSafe >= totalPages ? 'text-muted-foreground' : 'text-muted')}>
            Next
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}



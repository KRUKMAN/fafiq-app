import React from 'react';
import { View } from 'react-native';

import { cn } from '@/components/ui/cn';

export type TableCellProps = {
  children: React.ReactNode;
  flex: number;
  minWidth: number;
  align?: 'left' | 'center' | 'right';
  className?: string;
};

export function TableCell({ children, flex, minWidth, align, className }: TableCellProps) {
  return (
    <View
      className={cn('px-6 py-4', align === 'right' && 'items-end', align === 'center' && 'items-center', className)}
      style={{ flex, minWidth }}>
      {children}
    </View>
  );
}



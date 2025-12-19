import React from 'react';
import { View } from 'react-native';

import { cn } from './cn';
import { Typography } from './Typography';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: 'bg-gray-50 border-gray-200',
  primary: 'bg-primary border-primary',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
};

const TEXT_COLOR_CLASS: Record<BadgeVariant, string> = {
  default: 'text-gray-700',
  primary: 'text-white',
  success: 'text-green-700',
  warning: 'text-amber-700',
  error: 'text-red-700',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <View className={cn('px-3 py-1 rounded-full border', VARIANT_CLASS[variant], className)}>
      <Typography variant="bodySmall" className={cn('text-xs font-semibold', TEXT_COLOR_CLASS[variant])}>
        {children}
      </Typography>
    </View>
  );
}


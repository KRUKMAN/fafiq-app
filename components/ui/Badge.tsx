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
  default: 'bg-surface border-border',
  primary: 'bg-primary border-primary',
  success: 'bg-surface border-border',
  warning: 'bg-surface border-border',
  error: 'bg-surface border-border',
};

const TEXT_COLOR_CLASS: Record<BadgeVariant, string> = {
  default: 'text-foreground',
  primary: 'text-white',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
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


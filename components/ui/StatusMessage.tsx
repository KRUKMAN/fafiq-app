import React from 'react';
import { View } from 'react-native';

import { cn } from './cn';
import { Typography } from './Typography';

export type StatusMessageVariant = 'info' | 'success' | 'error';

export type StatusMessageProps = {
  variant?: StatusMessageVariant;
  message: string | null;
  className?: string;
};

const VARIANT_CLASS: Record<StatusMessageVariant, string> = {
  info: 'bg-surface border-border',
  success: 'bg-surface border-border',
  error: 'bg-surface border-border',
};

const TEXT_COLOR: Record<StatusMessageVariant, 'muted' | 'success' | 'error'> = {
  info: 'muted',
  success: 'success',
  error: 'error',
};

export function StatusMessage({ variant = 'info', message, className }: StatusMessageProps) {
  if (!message) return null;

  return (
    <View className={cn('border rounded-md px-3 py-2', VARIANT_CLASS[variant], className)}>
      <Typography variant="caption" color={TEXT_COLOR[variant]}>
        {message}
      </Typography>
    </View>
  );
}


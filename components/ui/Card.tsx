import React from 'react';
import { View } from 'react-native';

import { cn } from './cn';
import { Typography } from './Typography';

export type CardVariant = 'default' | 'outline' | 'elevated';

export type CardProps = {
  title?: string;
  variant?: CardVariant;
  className?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: 'bg-white border border-border shadow-sm',
  outline: 'bg-white border-2 border-border',
  elevated: 'bg-white border border-border shadow-lg',
};

export function Card({ title, variant = 'default', headerRight, className, children }: CardProps) {
  return (
    <View className={cn('rounded-lg p-5', VARIANT_CLASS[variant], className)}>
      {title ? (
        <View className="flex-row items-center justify-between mb-4">
          <Typography variant="label" className="text-xs font-bold text-gray-900 tracking-[0.08em] uppercase">
            {title}
          </Typography>
          {headerRight}
        </View>
      ) : null}
      {children}
    </View>
  );
}



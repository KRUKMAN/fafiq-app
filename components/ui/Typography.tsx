import React from 'react';
import { Text, type TextProps } from 'react-native';

import { cn } from './cn';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label';

export type TypographyColor = 'default' | 'muted' | 'error' | 'success';

export type TypographyProps = TextProps & {
  variant?: TypographyVariant;
  color?: TypographyColor;
  className?: string;
};

const VARIANT_CLASS: Record<TypographyVariant, string> = {
  h1: 'text-3xl font-bold text-gray-900 tracking-tight',
  h2: 'text-2xl font-bold text-gray-900 tracking-tight',
  h3: 'text-xl font-semibold text-gray-900',
  body: 'text-sm text-gray-900',
  bodySmall: 'text-xs text-gray-900',
  caption: 'text-xs text-gray-500',
  label: 'text-xs font-semibold text-gray-700 uppercase tracking-wide',
};

const COLOR_CLASS: Record<TypographyColor, string> = {
  default: '',
  muted: 'text-gray-600',
  error: 'text-red-600',
  success: 'text-green-600',
};

export function Typography({
  variant = 'body',
  color = 'default',
  className,
  ...props
}: TypographyProps) {
  return <Text {...props} className={cn(VARIANT_CLASS[variant], COLOR_CLASS[color], className)} />;
}



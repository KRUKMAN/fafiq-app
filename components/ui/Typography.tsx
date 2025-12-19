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
  h1: 'text-3xl font-bold text-foreground tracking-tight',
  h2: 'text-2xl font-bold text-foreground tracking-tight',
  h3: 'text-xl font-semibold text-foreground',
  body: 'text-sm text-foreground',
  bodySmall: 'text-xs text-foreground',
  caption: 'text-xs text-muted',
  label: 'text-xs font-semibold text-muted uppercase tracking-wide',
};

const COLOR_CLASS: Record<TypographyColor, string> = {
  default: '',
  muted: 'text-muted',
  error: 'text-destructive',
  success: 'text-success',
};

export function Typography({
  variant = 'body',
  color = 'default',
  className,
  ...props
}: TypographyProps) {
  return <Text {...props} className={cn(VARIANT_CLASS[variant], COLOR_CLASS[color], className)} />;
}



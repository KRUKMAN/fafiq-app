import React, { forwardRef, useMemo } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';

import { UI_COLORS } from '@/constants/uiColors';

import { cn } from './cn';
import { Typography } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
};

const BASE =
  'flex-row items-center justify-center rounded-md border shadow-sm active:opacity-90 disabled:opacity-50';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary',
  secondary: 'bg-surface border-border',
  ghost: 'bg-transparent border-transparent',
  outline: 'bg-card border-border',
  destructive: 'bg-destructive border-destructive',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 min-h-[44px]',
  md: 'px-4 py-3 min-h-[44px]',
  lg: 'px-5 py-4 min-h-[48px]',
};

function textColorForVariant(variant: ButtonVariant, disabled?: boolean) {
  if (disabled) return 'text-muted-foreground';
  if (variant === 'primary' || variant === 'destructive') return 'text-white';
  return 'text-foreground';
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    textClassName,
    children,
    ...props
  },
  ref
) {
  const isDisabled = Boolean(disabled || loading);
  const textClass = useMemo(() => cn('text-sm font-semibold', textColorForVariant(variant, isDisabled), textClassName), [
    variant,
    isDisabled,
    textClassName,
  ]);

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], fullWidth && 'w-full', className)}
      {...props}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? UI_COLORS.white : UI_COLORS.foreground}
        />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Typography className={textClass}>{children as any}</Typography>
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
});



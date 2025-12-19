import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { PLACEHOLDER_TEXT_COLOR } from '@/constants/uiColors';

import { cn } from './cn';
import { Typography } from './Typography';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  className?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, leftIcon, rightIcon, containerClassName, className, ...props },
  ref
) {
  const hasError = Boolean(error);
  return (
    <View className={cn('gap-1', containerClassName)}>
      {label ? <Typography variant="body" className="text-sm font-medium text-foreground">{label}</Typography> : null}

      <View
        className={cn(
          'min-h-[44px] flex-row items-center rounded-md border bg-card px-3 py-2',
          hasError ? 'border-destructive' : 'border-border'
        )}>
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...props}
          className={cn('flex-1 text-sm text-foreground', className)}
          placeholderTextColor={props.placeholderTextColor ?? PLACEHOLDER_TEXT_COLOR}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>

      {helper ? <Typography variant="caption" color="muted">{helper}</Typography> : null}
      {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
    </View>
  );
});



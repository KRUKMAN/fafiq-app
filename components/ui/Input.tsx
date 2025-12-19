import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

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
      {label ? <Typography variant="body" className="text-sm font-medium text-gray-800">{label}</Typography> : null}

      <View
        className={cn(
          'min-h-[44px] flex-row items-center rounded-md border bg-white px-3 py-2',
          hasError ? 'border-red-400' : 'border-border'
        )}>
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...props}
          className={cn('flex-1 text-sm text-gray-900', className)}
          placeholderTextColor={props.placeholderTextColor ?? '#9CA3AF'}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>

      {helper ? <Typography variant="caption" className="text-gray-500">{helper}</Typography> : null}
      {error ? <Typography variant="caption" className="text-red-600">{error}</Typography> : null}
    </View>
  );
});



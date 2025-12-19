import React from 'react';
import { ActivityIndicator, type ActivityIndicatorProps, View } from 'react-native';

import { cn } from './cn';
import { Typography } from './Typography';

export type SpinnerProps = ActivityIndicatorProps & {
  label?: string;
  className?: string;
};

export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <View className={cn('items-center justify-center', className)}>
      <ActivityIndicator {...props} />
      {label ? <Typography variant="caption" className="mt-2 text-gray-600">{label}</Typography> : null}
    </View>
  );
}



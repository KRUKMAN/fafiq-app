import React from 'react';
import { Text, View } from 'react-native';

const STATUS_STYLES: Record<string, { container: string; text: string }> = {
  'Medical Hold': { container: 'bg-surface border-border', text: 'text-destructive' },
  Medical: { container: 'bg-surface border-border', text: 'text-destructive' },
  Transport: { container: 'bg-surface border-border', text: 'text-warning' },
  Available: { container: 'bg-surface border-border', text: 'text-success' },
};

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge = React.memo(({ status }: StatusBadgeProps) => {
  const style = STATUS_STYLES[status] ?? {
    container: 'bg-surface border-border',
    text: 'text-muted',
  };

  return (
    <View className={`px-3 py-1 rounded-full border ${style.container} min-w-32`}>
      <Text className={`text-xs font-semibold ${style.text}`} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

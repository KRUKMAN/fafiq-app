import React from 'react';
import { Text, View } from 'react-native';

const STATUS_STYLES: Record<string, { container: string; text: string }> = {
  'In Foster': { container: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  'Medical Hold': { container: 'bg-red-50 border-red-200', text: 'text-red-700' },
  Medical: { container: 'bg-red-50 border-red-200', text: 'text-red-700' },
  Available: { container: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'Pending Adoption': { container: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  Transport: { container: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  Intake: { container: 'bg-gray-100 border-gray-200', text: 'text-gray-700' },
};

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge = React.memo(({ status }: StatusBadgeProps) => {
  const style = STATUS_STYLES[status] ?? {
    container: 'bg-gray-50 border-gray-200',
    text: 'text-gray-600',
  };

  return (
    <View className={`px-3 py-1 rounded-full border ${style.container} min-w-[120px]`}>
      <Text className={`text-xs font-semibold ${style.text}`} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

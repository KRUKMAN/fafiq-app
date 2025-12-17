import React from 'react';
import { Text, View } from 'react-native';

const STATUS_STYLES: Record<string, string> = {
  'In Foster': 'bg-blue-50 border-blue-200 text-blue-700',
  'Medical Hold': 'bg-red-50 border-red-200 text-red-700',
  Medical: 'bg-red-50 border-red-200 text-red-700',
  Available: 'bg-green-50 border-green-200 text-green-700',
  'Pending Adoption': 'bg-purple-50 border-purple-200 text-purple-700',
  Transport: 'bg-amber-50 border-amber-200 text-amber-700',
  Intake: 'bg-gray-100 border-gray-200 text-gray-700',
};

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge = React.memo(({ status }: StatusBadgeProps) => {
  const style = STATUS_STYLES[status] ?? 'bg-gray-50 border-gray-200 text-gray-600';

  return (
    <View className={`px-2.5 py-1 rounded-full border ${style}`}>
      <Text className="text-xs font-semibold" numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

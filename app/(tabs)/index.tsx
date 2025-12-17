import React from 'react';
import { Text, View } from 'react-native';

export default function DashboardPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <View className="p-6 rounded-lg border border-border bg-white shadow-sm">
        <Text className="text-lg font-semibold text-gray-900">Dashboard</Text>
        <Text className="mt-2 text-sm text-gray-600">
          This dashboard is a placeholder. Use the Dogs tab to view the list and details.
        </Text>
      </View>
    </View>
  );
}

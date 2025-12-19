import React from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <View className="items-center justify-center py-12 px-4">
    <Text className="text-base font-semibold text-gray-900">{title}</Text>
    {description ? <Text className="text-sm text-gray-600 mt-2 text-center">{description}</Text> : null}
  </View>
);


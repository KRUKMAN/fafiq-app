import React from 'react';
import { Text, View } from 'react-native';

type PlaceholderSectionProps = {
  title: string;
  description: string;
};

export function PlaceholderSection({ title, description }: PlaceholderSectionProps) {
  return (
    <View className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-4">
        <View className="w-full max-w-xl p-6 rounded-lg border border-border bg-white shadow-sm">
          <Text className="text-xl font-bold text-gray-900">{title}</Text>
          <Text className="mt-2 text-sm text-gray-600">{description}</Text>
        </View>
      </View>
    </View>
  );
}

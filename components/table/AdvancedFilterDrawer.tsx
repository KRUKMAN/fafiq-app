import React from 'react';
import { Pressable, Text, View } from 'react-native';

type AdvancedFilterDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export const AdvancedFilterDrawer = ({ visible, onClose, children }: AdvancedFilterDrawerProps) => {
  if (!visible) return null;

  return (
    <View className="absolute top-0 bottom-0 right-0 w-full max-w-md z-20 bg-white shadow-2xl border-l border-border">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-base font-semibold text-gray-900">Advanced Filters</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="px-3 py-1 rounded-md border border-border bg-white">
          <Text className="text-sm text-gray-700">Close</Text>
        </Pressable>
      </View>
      <View className="flex-1 px-4 py-4">
        {children ?? <Text className="text-sm text-gray-500">No filters yet.</Text>}
      </View>
    </View>
  );
};

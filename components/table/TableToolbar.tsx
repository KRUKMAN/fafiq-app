import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Filter, Search } from 'lucide-react-native';

type TableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: { label: string; value: string; active: boolean; onPress: () => void }[];
  onOpenAdvancedFilters?: () => void;
};

export const TableToolbar = ({
  searchValue,
  onSearchChange,
  filters,
  onOpenAdvancedFilters,
}: TableToolbarProps) => {
  return (
    <View className="px-6 py-4 bg-white border-b border-border">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center h-11 px-4 rounded-md border border-border bg-white">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Search by name, ID, or foster..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-sm text-gray-900"
            value={searchValue}
            onChangeText={onSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={onOpenAdvancedFilters}
            className="flex-row items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg shadow-sm hover:bg-gray-50">
            <Filter size={16} color="#374151" />
            <Text className="text-sm font-medium text-gray-700">Filters</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {filters.map((f) => (
          <Pressable
            key={f.value}
            accessibilityRole="button"
            onPress={f.onPress}
            className={`px-3 py-1.5 rounded-full border ${
              f.active ? 'bg-gray-900 border-gray-900 shadow-sm' : 'bg-white border-border'
            }`}>
            <Text className={`text-sm ${f.active ? 'text-white font-semibold' : 'text-gray-700'}`}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

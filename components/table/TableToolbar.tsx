import React from 'react';
import { TextInput, View } from 'react-native';
import { Filter, Search } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';

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

        {onOpenAdvancedFilters && (
          <View className="flex-row items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter size={16} color="#374151" />}
              onPress={onOpenAdvancedFilters}>
              Filters
            </Button>
          </View>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={f.active ? 'primary' : 'outline'}
            size="sm"
            className="rounded-full"
            onPress={f.onPress}>
            {f.label}
          </Button>
        ))}
      </View>
    </View>
  );
};

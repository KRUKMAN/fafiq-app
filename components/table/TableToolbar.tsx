import React from 'react';
import { View } from 'react-native';
import { Filter, Search } from 'lucide-react-native';

import { STRINGS } from '@/constants/strings';
import { UI_COLORS } from '@/constants/uiColors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type TableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: { label: string; value: string; active: boolean; onPress: () => void }[];
  onOpenAdvancedFilters?: () => void;
};

export const TableToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = STRINGS.filters.searchPlaceholderGeneric,
  filters,
  onOpenAdvancedFilters,
}: TableToolbarProps) => {
  return (
    <View className="px-6 py-4 bg-card border-b border-border">
      <View className="flex-row items-center gap-3">
        <Input
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          containerClassName="flex-1"
          leftIcon={<Search size={16} color={UI_COLORS.mutedForeground} />}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {onOpenAdvancedFilters && (
          <View className="flex-row items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter size={16} color={UI_COLORS.foreground} />}
              onPress={onOpenAdvancedFilters}>
              {STRINGS.filters.filtersButton}
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

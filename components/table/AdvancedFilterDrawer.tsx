import React from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

type AdvancedFilters = {
  location?: string;
  responsible?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  hasAlerts?: boolean;
};

type AdvancedFilterDrawerProps = {
  visible: boolean;
  onClose: () => void;
  filters?: AdvancedFilters;
  onChangeFilters?: (patch: Partial<AdvancedFilters>) => void;
  onApply?: () => void;
  onClear?: () => void;
  children?: React.ReactNode;
};

export const AdvancedFilterDrawer = ({
  visible,
  onClose,
  filters,
  onChangeFilters,
  onApply,
  onClear,
  children,
}: AdvancedFilterDrawerProps) => {
  if (!visible) return null;

  const canRenderBuiltIn = filters && onChangeFilters;

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
        {canRenderBuiltIn ? (
          <View className="gap-4">
            <FilterField label="Location">
              <TextInput
                placeholder="e.g. Shelter HQ or Vet"
                placeholderTextColor="#9CA3AF"
                className="border border-border rounded-md px-3 py-2 text-sm text-gray-900"
                value={filters.location ?? ''}
                onChangeText={(text) => onChangeFilters?.({ location: text })}
              />
            </FilterField>

            <FilterField label="Responsible person">
              <TextInput
                placeholder="e.g. Maria Garcia"
                placeholderTextColor="#9CA3AF"
                className="border border-border rounded-md px-3 py-2 text-sm text-gray-900"
                value={filters.responsible ?? ''}
                onChangeText={(text) => onChangeFilters?.({ responsible: text })}
              />
            </FilterField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FilterField label="Updated after">
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    className="border border-border rounded-md px-3 py-2 text-sm text-gray-900"
                    value={filters.updatedAfter ?? ''}
                    onChangeText={(text) => onChangeFilters?.({ updatedAfter: text })}
                  />
                </FilterField>
              </View>
              <View className="flex-1">
                <FilterField label="Updated before">
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    className="border border-border rounded-md px-3 py-2 text-sm text-gray-900"
                    value={filters.updatedBefore ?? ''}
                    onChangeText={(text) => onChangeFilters?.({ updatedBefore: text })}
                  />
                </FilterField>
              </View>
            </View>

            <FilterField label="Has alerts">
              <View className="flex-row items-center justify-between px-3 py-2 border border-border rounded-md bg-surface">
                <Text className="text-sm text-gray-800">Only show dogs with alerts</Text>
                <Switch
                  value={Boolean(filters.hasAlerts)}
                  onValueChange={(value) => onChangeFilters?.({ hasAlerts: value })}
                />
              </View>
            </FilterField>

            <View className="flex-row justify-end gap-3 pt-2">
              <Pressable
                accessibilityRole="button"
                onPress={onClear}
                className="px-4 py-2 rounded-md border border-border bg-white">
                <Text className="text-sm font-medium text-gray-700">Reset</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onApply}
                className="px-4 py-2 rounded-md border border-gray-900 bg-gray-900">
                <Text className="text-sm font-semibold text-white">Apply filters</Text>
              </Pressable>
            </View>
          </View>
        ) : children ? (
          children
        ) : (
          <Text className="text-sm text-gray-500">No filters yet.</Text>
        )}
      </View>
    </View>
  );
};

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="gap-2">
    <Text className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</Text>
    {children}
  </View>
);

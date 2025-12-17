import React from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

type Column = {
  key: string;
  label: string;
  flex: number;
  minWidth: number;
  align?: 'right' | 'left' | 'center';
};

type DataTableProps<T> = {
  columns: Column[];
  data: T[];
  renderRow: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  minWidth: number;
  ListEmptyComponent?: React.ReactElement | null;
  ItemSeparatorComponent?: React.ComponentType;
};

export function DataTable<T>({
  columns,
  data,
  renderRow,
  minWidth,
  ListEmptyComponent,
  ItemSeparatorComponent,
}: DataTableProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      className="flex-1 bg-white"
      contentContainerStyle={{ minWidth, flexGrow: 1 }}>
      <FlatList
        style={{ flex: 1, width: '100%' }}
        data={data}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderRow}
        ListHeaderComponent={<TableHeader columns={columns} />}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={
          ItemSeparatorComponent ?? (() => <View className="h-px bg-border" />)
        }
        ListEmptyComponent={
          ListEmptyComponent ?? (
            <View className="items-center justify-center py-12">
              <Text className="text-sm text-gray-500">No records to display.</Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ScrollView>
  );
}

const TableHeader = React.memo(({ columns }: { columns: Column[] }) => (
  <View className="flex-row bg-gray-50 border-b border-border" style={{ width: '100%' }}>
    {columns.map((col) => (
      <View
        key={col.key}
        style={{ flex: col.flex, minWidth: col.minWidth }}
        className="px-6 py-3">
        <Text
          numberOfLines={1}
          className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${
            col.align === 'right' || col.key === 'actions' ? 'text-right' : ''
          }`}>
          {col.label}
        </Text>
      </View>
    ))}
  </View>
));

TableHeader.displayName = 'TableHeader';

import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';

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
      className="flex-1 bg-card"
      contentContainerStyle={{ minWidth, flexGrow: 1 }}>
      <FlashList
        style={{ flex: 1, width: '100%' }}
        data={data}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderRow}
        ListHeaderComponent={<TableHeader columns={columns} />}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={
          ItemSeparatorComponent ?? (() => <View className="h-px bg-border" />)
        }
        ListEmptyComponent={ListEmptyComponent ?? <EmptyState title="No records to display." />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={80}
      />
    </ScrollView>
  );
}

const TableHeader = React.memo(({ columns }: { columns: Column[] }) => (
  <View className="flex-row bg-surface border-b border-border" style={{ width: '100%' }}>
    {columns.map((col) => (
      <View
        key={col.key}
        style={{ flex: col.flex, minWidth: col.minWidth }}
        className="px-6 py-3">
        <Text
          numberOfLines={1}
          className={`text-xs font-semibold text-muted uppercase tracking-wider ${
            col.align === 'right' || col.key === 'actions' ? 'text-right' : ''
          }`}>
          {col.label}
        </Text>
      </View>
    ))}
  </View>
));

TableHeader.displayName = 'TableHeader';

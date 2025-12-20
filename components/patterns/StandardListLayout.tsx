import React, { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/patterns/DataView';
import { Pagination } from '@/components/patterns/Pagination';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { AdvancedFilterDrawer } from '@/components/table/AdvancedFilterDrawer';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { getPagination } from '@/lib/pagination';

export type TableColumn = {
  key: string;
  label: string;
  flex: number;
  minWidth: number;
  align?: 'right' | 'left' | 'center';
};

export type TableRowItem = Record<string, any>;

export type StandardEntityHook<TItem, TFilterState> = (
  orgId: string | undefined,
  filters: TFilterState
) => {
  data: TItem[] | undefined;
  isLoading: boolean;
  error: unknown;
};

export type QuickFilter = {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
};

export type StandardListLayoutProps<TItem, TFilterState> = {
  // Session & Guard
  session: {
    ready: boolean;
    bootstrap: () => void;
    memberships: any[];
    activeOrgId: string | null;
  };

  // Header
  title: string;
  subtitle?: string;
  headerActions?: React.ReactElement[];

  // Data
  useEntityHook: StandardEntityHook<TItem, TFilterState>;
  filters: TFilterState;
  onFiltersChange: (filters: Partial<TFilterState>) => void;

  // Table Configuration
  columns: TableColumn[];
  minTableWidth: number;
  toRowItem: (item: TItem) => TableRowItem;

  // Toolbar
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchDebounceMs?: number; // Default: 250ms
  quickFilters?: QuickFilter[];
  onOpenAdvancedFilters?: () => void;

  // Advanced Filters (optional)
  advancedFilters?: {
    visible: boolean;
    onClose: () => void;
    filters: Record<string, any>;
    onChangeFilters: (patch: Partial<TFilterState>) => void;
    onClear: () => void;
    onApply: () => void;
  };

  // Pagination
  page: number;
  pageSize: number;
  totalItems: number; // For pagination display
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes?: number[]; // Default: [10, 25, 50]

  // Actions (from action_matrix.md)
  onRowPress?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name?: string) => void;
  onViewHistory?: (id: string) => void;

  // Empty State
  emptyTitle?: string;
  emptyDescription?: string;
  emptyComponent?: React.ReactNode;
  emptyActions?: React.ReactNode; // e.g., "Reset Filters" button
  loadingLabel?: string;

  // Error Handling
  actionError?: string | null;

  // Row Renderer (for custom row components)
  renderRow: (props: {
    item: TableRowItem;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onViewHistory?: () => void;
  }) => React.ReactNode;

  // Delete Confirmation
  deleteConfirmation?: {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  };
};

export function StandardListLayout<TItem, TFilterState extends Record<string, any>>({
  session,
  title,
  subtitle,
  headerActions,
  useEntityHook,
  filters,
  onFiltersChange,
  columns,
  minTableWidth,
  toRowItem,
  searchValue,
  onSearchChange,
  searchDebounceMs = 250,
  quickFilters = [],
  onOpenAdvancedFilters,
  advancedFilters,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50],
  onRowPress,
  onEdit,
  onDelete,
  onViewHistory,
  emptyTitle = 'No records to display.',
  emptyDescription,
  emptyComponent,
  emptyActions,
  loadingLabel = 'Loading...',
  actionError,
  renderRow,
  deleteConfirmation,
}: StandardListLayoutProps<TItem, TFilterState>) {
  const { activeOrgId } = session;

  // Debounce search input (preserves UX polish from dogs/index.tsx)
  // The parent component should handle the debouncing and filter updates
  // This component just uses the filters as provided
  useEffect(() => {
    const handle = setTimeout(() => {
      onFiltersChange({ search: searchValue.trim() } as unknown as Partial<TFilterState>);
      onPageChange(1);
    }, searchDebounceMs);
    return () => clearTimeout(handle);
  }, [searchValue, searchDebounceMs, onFiltersChange, onPageChange]);

  // Fetch data using the provided hook
  const { data, isLoading, error } = useEntityHook(activeOrgId ?? undefined, filters);

  // Transform data to row items
  const list = useMemo(() => (data ?? []).map(toRowItem), [data, toRowItem]);

  // Pagination calculation
  const pagination = useMemo(
    () => getPagination({ page, pageSize, totalItems: list.length }),
    [page, pageSize, list.length]
  );

  // Paginated list
  const paginatedList = useMemo(
    () => list.slice(pagination.start, pagination.start + pageSize),
    [list, pagination.start, pageSize]
  );

  // Handlers
  const handlePressRow = useCallback(
    (id: string) => {
      onRowPress?.(id);
    },
    [onRowPress]
  );

  const handleEdit = useCallback(
    (id: string) => {
      onEdit?.(id);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (id: string, name?: string) => {
      onDelete?.(id, name);
    },
    [onDelete]
  );

  const handleViewHistory = useCallback(
    (id: string) => {
      onViewHistory?.(id);
    },
    [onViewHistory]
  );

  // Default empty component with reset button (preserves UX polish)
  const defaultEmptyComponent = (
    <View className="flex-1 items-center justify-center bg-surface">
      <EmptyState title={emptyTitle} description={emptyDescription} />
      {emptyActions}
    </View>
  );

  return (
    <ScreenGuard session={session}>
      <View className="flex-1 bg-background">
        <PageHeader title={title} subtitle={subtitle} actions={headerActions} />

        <TableToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onOpenAdvancedFilters={onOpenAdvancedFilters}
          filters={quickFilters}
        />

        {/* StatusMessage with proper spacing (px-6 pt-3) - preserves UX polish */}
        <View className="px-6 pt-3">
          <StatusMessage variant="error" message={actionError ?? null} />
        </View>

        {/* DataView with relative positioning - preserves UX polish */}
        <View className="flex-1 relative">
          <DataView
            data={paginatedList}
            isLoading={isLoading}
            error={error}
            isEmpty={() => list.length === 0}
            loadingLabel={loadingLabel}
            emptyComponent={emptyComponent ?? defaultEmptyComponent}>
            {(items) => (
              <DataTable
                columns={columns}
                data={items}
                minWidth={minTableWidth}
                renderRow={({ item }) => {
                  const row = renderRow({
                    item,
                    onPress: onRowPress ? () => handlePressRow(item.id) : undefined,
                    onEdit: onEdit ? () => handleEdit(item.id) : undefined,
                    onDelete: onDelete ? () => handleDelete(item.id, item.name) : undefined,
                    onViewHistory: onViewHistory ? () => handleViewHistory(item.id) : undefined,
                  });
                  // Ensure we always return a ReactElement
                  if (!row || (typeof row === 'object' && 'type' in row)) {
                    return row as React.ReactElement;
                  }
                  return <View />;
                }}
              />
            )}
          </DataView>
        </View>

        <Pagination
          page={pagination.pageSafe}
          pageSize={pageSize}
          totalItems={totalItems || list.length}
          pageSizes={pageSizes}
          onChangePage={onPageChange}
          onChangePageSize={onPageSizeChange}
        />

        {/* Advanced Filter Drawer (optional) */}
        {advancedFilters && (
          <AdvancedFilterDrawer
            visible={advancedFilters.visible}
            onClose={advancedFilters.onClose}
            filters={advancedFilters.filters}
            onChangeFilters={(patch) => advancedFilters.onChangeFilters(patch as unknown as Partial<TFilterState>)}
            onClear={advancedFilters.onClear}
            onApply={advancedFilters.onApply}
          />
        )}

        {/* Delete Confirmation Modal (optional) */}
        {deleteConfirmation && (
          <ConfirmationModal
            visible={deleteConfirmation.visible}
            title={deleteConfirmation.title}
            message={deleteConfirmation.message}
            confirmLabel={deleteConfirmation.confirmLabel}
            destructive
            loading={deleteConfirmation.loading}
            onConfirm={deleteConfirmation.onConfirm}
            onCancel={deleteConfirmation.onCancel}
          />
        )}
      </View>
    </ScreenGuard>
  );
}


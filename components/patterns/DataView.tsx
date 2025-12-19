import React from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Typography } from '@/components/ui/Typography';

export type DataViewProps<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  isEmpty?: (data: T) => boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyComponent?: React.ReactNode;
  children: (data: T) => React.ReactNode;
};

export function DataView<T>({
  data,
  isLoading,
  error,
  isEmpty,
  loadingLabel = 'Loading...',
  emptyTitle = 'No records to display.',
  emptyDescription,
  emptyComponent,
  children,
}: DataViewProps<T>) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Spinner label={loadingLabel} />
      </View>
    );
  }

  if (error) {
    const message = (error as any)?.message ?? 'Please try again shortly.';
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Typography variant="body" className="text-base font-semibold">
          Failed to load data
        </Typography>
        <Typography variant="body" color="muted" className="mt-2 text-center">
          {message}
        </Typography>
      </View>
    );
  }

  if (!data) return null;

  const empty = isEmpty ? isEmpty(data) : Array.isArray(data) ? data.length === 0 : false;
  if (empty) {
    return <>{emptyComponent ?? <EmptyState title={emptyTitle} description={emptyDescription} />}</>;
  }

  return <>{children(data)}</>;
}



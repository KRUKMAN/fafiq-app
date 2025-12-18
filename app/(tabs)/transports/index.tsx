import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useSessionStore } from '@/stores/sessionStore';
import { useTransports } from '@/hooks/useTransports';

export default function TransportsScreen() {
  const { ready, activeOrgId, memberships, bootstrap } = useSessionStore();
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading session...</Text>
      </View>
    );
  }

  if (ready && memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Join or create an organization to view transports.
        </Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view transports.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading transports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">Failed to load transports</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          {(error as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-sm text-gray-600">No transports scheduled for this org.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ padding: 16, gap: 12 }}>
      {data.map((t) => (
        <View key={t.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-900">Transport {t.id}</Text>
            <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">{t.status}</Text>
          </View>
          <Text className="text-sm text-gray-800">
            From: <Text className="font-semibold">{t.from_location || 'Unknown'}</Text>
          </Text>
          <Text className="text-sm text-gray-800">
            To: <Text className="font-semibold">{t.to_location || 'Unknown'}</Text>
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            Window: {formatDateRange(t.window_start, t.window_end)}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Assigned: {t.assigned_membership_id || 'Unassigned'}
          </Text>
          {t.notes ? <Text className="text-sm text-gray-700 mt-2">{t.notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Not scheduled';
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const format = (d: Date | null) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
  const startStr = format(startDate);
  const endStr = format(endDate);
  if (startStr && endStr) return `${startStr} → ${endStr}`;
  return startStr || endStr || 'Not scheduled';
};

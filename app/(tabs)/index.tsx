import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useSessionStore } from '@/stores/sessionStore';

export default function DashboardPlaceholder() {
  const { ready, memberships, activeOrgId, bootstrap } = useSessionStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-muted">Loading session...</Text>
      </View>
    );
  }

  if (ready && memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-foreground">No memberships found</Text>
        <Text className="mt-2 text-sm text-muted text-center">
          Join or create an organization to view the dashboard.
        </Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-foreground">No active organization</Text>
        <Text className="mt-2 text-sm text-muted text-center">
          Select an organization to view dashboard data.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <View className="p-6 rounded-lg border border-border bg-card shadow-sm">
        <Text className="text-lg font-semibold text-foreground">Dashboard</Text>
        <Text className="mt-2 text-sm text-muted">
          This dashboard is a placeholder. Use the Dogs tab to view the list and details.
        </Text>
      </View>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import '../global.css';

import { useAppReconciliation } from '@/hooks/useAppReconciliation';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getQueryClient } from '@/lib/queryClient';
import { useSessionStore } from '@/stores/sessionStore';
import { AppErrorBoundary } from '@/components/patterns/AppErrorBoundary';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <ThemedLayout />
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

function ThemedLayout() {
  const colorScheme = useColorScheme();
  const { activeOrgId } = useSessionStore();
  const { syncNotifications } = useNotificationSync(activeOrgId);

  useAppReconciliation({
    orgId: activeOrgId,
    onResume: syncNotifications,
  });

  useEffect(() => {
    if (activeOrgId) {
      void syncNotifications();
    }
  }, [activeOrgId, syncNotifications]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

import React, { useEffect } from 'react';
import { View } from 'react-native';

import { Spinner } from '@/components/ui/Spinner';
import { Typography } from '@/components/ui/Typography';

type SessionLike = {
  ready: boolean;
  bootstrap: () => void;
  memberships: any[];
  activeOrgId: string | null;
};

export type ScreenGuardProps = {
  session: SessionLike;
  isLoading?: boolean;
  error?: unknown;
  loadingLabel?: string;
  children: React.ReactNode;
};

export function ScreenGuard({ session, isLoading, error, loadingLabel = 'Loading...', children }: ScreenGuardProps) {
  const { ready, bootstrap, memberships, activeOrgId } = session;

  useEffect(() => {
    if (!ready) bootstrap();
  }, [ready, bootstrap]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Spinner label="Loading session..." />
      </View>
    );
  }

  if (memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Typography variant="body" className="text-base font-semibold text-gray-900">
          No memberships found
        </Typography>
        <Typography variant="body" color="muted" className="mt-2 text-center">
          Join or create an organization to continue.
        </Typography>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Typography variant="body" className="text-base font-semibold text-gray-900">
          No active organization
        </Typography>
        <Typography variant="body" color="muted" className="mt-2 text-center">
          Select an organization to continue.
        </Typography>
      </View>
    );
  }

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
        <Typography variant="body" className="text-base font-semibold text-gray-900">
          Failed to load data
        </Typography>
        <Typography variant="body" color="muted" className="mt-2 text-center">
          {message}
        </Typography>
      </View>
    );
  }

  return <>{children}</>;
}



import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { TransportDetailDrawer } from '@/components/transports/TransportsDrawers';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { useTransports } from '@/hooks/useTransports';
import { useSessionStore } from '@/stores/sessionStore';

export default function TransportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transportId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const { ready, activeOrgId, memberships, bootstrap } = useSessionStore();
  const { data, isLoading } = useTransports(activeOrgId ?? undefined);
  const { transportStatuses } = useOrgSettings(activeOrgId ?? undefined);
  const supabaseReady = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <ScreenGuard
      session={{ ready, bootstrap, memberships, activeOrgId }}
      isLoading={isLoading}
      loadingLabel="Loading transport...">
      <TransportDetailDrawer
        transportId={transportId ?? null}
        transports={data ?? []}
        onClose={() => router.back()}
        onEdit={(transport) => {
          router.replace({
            pathname: '/transports',
            params: { editTransportId: transport.id },
          });
        }}
        orgId={activeOrgId}
        supabaseReady={supabaseReady}
        statusOptions={transportStatuses}
      />
    </ScreenGuard>
  );
}


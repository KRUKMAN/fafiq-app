import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { Transport } from '@/schemas/transport';
import { useSessionStore } from '@/stores/sessionStore';
import { useTransports } from '@/hooks/useTransports';
import { OrgSelector } from './OrgSelector';

export default function TransportsScreen() {
  const router = useRouter();
  const { ready, activeOrgId, memberships, bootstrap, switchOrg } = useSessionStore();
  const [viewMode, setViewMode] = React.useState<'transports' | 'transporters'>('transports');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);
  const {
    data: memberData,
    isLoading: membersLoading,
    error: membersError,
  } = useOrgMemberships(activeOrgId ?? undefined);

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

  if (isLoading || (viewMode === 'transporters' && membersLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">
          {viewMode === 'transporters' ? 'Loading transporters...' : 'Loading transports...'}
        </Text>
      </View>
    );
  }

  if (error || membersError) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">Failed to load data</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          {(error as Error)?.message || (membersError as Error)?.message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  const transportRows = useMemo(() => (data ?? []).map(toTransportRow), [data]);
  const transporterRows = useMemo(() => {
    const transportsRole = 'transport';
    return (memberData ?? [])
      .filter((m) => m.roles.includes(transportsRole))
      .map((m) => ({
        id: m.id,
        name: m.user_name,
        email: m.user_email ?? 'email unavailable',
        userId: m.user_id,
        roles: m.roles.join(', ') || 'no roles',
        status: m.active ? 'active' : 'inactive',
      }));
  }, [memberData]);

  const activeRows = viewMode === 'transporters' ? transporterRows : transportRows;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeRows;
    return activeRows.filter((row: any) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(term))
    );
  }, [activeRows, search]);

  if (!filteredRows.length) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-sm text-gray-600">
          {viewMode === 'transporters'
            ? 'No transporters found for this org.'
            : 'No transports scheduled for this org.'}
        </Text>
      </View>
    );
  }

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginated = filteredRows.slice(start, start + pageSize);

  return (
    <View className="flex-1 bg-white">
      <PageHeader
        title="Transports"
        subtitle="View transport events or transporters assigned to your org."
        actions={[
          <View key="toggle" className="flex-row gap-2">
            {[
              { label: 'Transports', value: 'transports' as const },
              { label: 'Transporters', value: 'transporters' as const },
            ].map((opt) => {
              const active = viewMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setViewMode(opt.value);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>,
          <OrgSelector
            key="org"
            activeOrgId={activeOrgId}
            memberships={memberships}
            switchOrg={switchOrg}
            ready={ready}
          />,
        ]}
      />
      <TableToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filters={[]}
        disableFilters
      />
      <DataTable
        columns={viewMode === 'transporters' ? TRANSPORTER_COLUMNS : TRANSPORT_COLUMNS}
        data={paginated}
        minWidth={viewMode === 'transporters' ? TRANSPORTER_TABLE_MIN_WIDTH : TRANSPORT_TABLE_MIN_WIDTH}
        renderRow={({ item }) => (
          <TransportRow
            item={item}
            isTransporter={viewMode === 'transporters'}
            onPress={() => {
              if (viewMode === 'transporters') return;
              router.push(`/transports/${item.id}` as never);
            }}
          />
        )}
      />
      <View className="border-t border-border px-6 py-3 bg-gray-50 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-gray-500">Rows per page:</Text>
          {[10, 25, 50].map((size) => {
            const active = pageSize === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                onPress={() => {
                  setPageSize(size);
                  setPage(1);
                }}
                className={`px-2 py-1 rounded-md border ${
                  active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                }`}>
                <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-gray-700'}`}>{size}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="items-center">
          <Text className="text-sm text-gray-500">
            Page {pageSafe} of {totalPages}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Showing{' '}
            <Text className="font-medium text-gray-900">
              {paginated.length} / {filteredRows.length}
            </Text>{' '}
            records
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe <= 1}
            onPress={() => setPage(Math.max(1, pageSafe - 1))}
            className={`px-3 py-1 border border-border bg-white rounded text-sm ${
              pageSafe <= 1 ? 'text-gray-400 opacity-60' : 'text-gray-600'
            }`}>
            <Text className="text-sm">Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe >= totalPages}
            onPress={() => setPage(Math.min(totalPages, pageSafe + 1))}
            className={`px-3 py-1 border border-border bg-white rounded text-sm ${
              pageSafe >= totalPages ? 'text-gray-400 opacity-60' : 'text-gray-600'
            }`}>
            <Text className="text-sm">Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
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

type TransportRowItem = {
  id: string;
  status: string;
  from: string;
  to: string;
  window: string;
  assigned: string;
};

const TRANSPORT_COLUMNS = [
  { key: 'id', label: 'Transport', flex: 1.2, minWidth: 160 },
  { key: 'status', label: 'Status', flex: 1, minWidth: 120 },
  { key: 'from', label: 'From', flex: 1.2, minWidth: 160 },
  { key: 'to', label: 'To', flex: 1.2, minWidth: 160 },
  { key: 'window', label: 'Window', flex: 1.4, minWidth: 180 },
  { key: 'assigned', label: 'Assigned', flex: 1, minWidth: 140 },
];

const TRANSPORT_TABLE_MIN_WIDTH = TRANSPORT_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);

const toTransportRow = (t: Transport): TransportRowItem => ({
  id: t.id,
  status: t.status,
  from: t.from_location || 'Unknown',
  to: t.to_location || 'Unknown',
  window: formatDateRange(t.window_start, t.window_end),
  assigned: t.assigned_membership_id || 'Unassigned',
});

const TRANSPORTER_COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.4, minWidth: 200 },
  { key: 'email', label: 'Email', flex: 1.4, minWidth: 200 },
  { key: 'userId', label: 'User ID', flex: 1.2, minWidth: 200 },
  { key: 'roles', label: 'Roles', flex: 1, minWidth: 150 },
  { key: 'status', label: 'Status', flex: 0.8, minWidth: 120 },
];

const TRANSPORTER_TABLE_MIN_WIDTH = TRANSPORTER_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);

const TransportRow = ({
  item,
  onPress,
  isTransporter,
}: {
  item: any;
  onPress: () => void;
  isTransporter: boolean;
}) => {
  if (isTransporter) {
    return (
      <View className="flex-row items-center" style={{ width: '100%' }}>
        <Cell flex={1.4} minWidth={200}>
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {item.name}
          </Text>
        </Cell>
        <Cell flex={1.4} minWidth={200}>
          <Text className="text-xs text-gray-700" numberOfLines={1}>
            {item.email}
          </Text>
        </Cell>
        <Cell flex={1.2} minWidth={200}>
          <Text className="text-[11px] text-gray-600" numberOfLines={1}>
            {item.userId}
          </Text>
        </Cell>
        <Cell flex={1} minWidth={150}>
          <Text className="text-xs text-gray-700" numberOfLines={1}>
            {item.roles}
          </Text>
        </Cell>
        <Cell flex={0.8} minWidth={120}>
          <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
            {item.status}
          </Text>
        </Cell>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center"
      style={{ width: '100%' }}>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
          {item.id}
        </Text>
      </Cell>
      <Cell flex={1} minWidth={120}>
        <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white" numberOfLines={1}>
          {item.status}
        </Text>
      </Cell>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm text-gray-800" numberOfLines={1}>
          {item.from}
        </Text>
      </Cell>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm text-gray-800" numberOfLines={1}>
          {item.to}
        </Text>
      </Cell>
      <Cell flex={1.4} minWidth={180}>
        <Text className="text-xs text-gray-600" numberOfLines={1}>
          {item.window}
        </Text>
      </Cell>
      <Cell flex={1} minWidth={140}>
        <Text className="text-xs text-gray-700" numberOfLines={1}>
          {item.assigned}
        </Text>
      </Cell>
    </Pressable>
  );
};

const Cell = ({
  children,
  flex,
  minWidth,
}: {
  children: React.ReactNode;
  flex: number;
  minWidth: number;
}) => (
  <View className="px-6 py-4" style={{ flex, minWidth }}>
    {children}
  </View>
);

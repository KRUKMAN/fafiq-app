import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { OrgSelector } from './OrgSelector';
import { useSessionStore } from '@/stores/sessionStore';

type MemberRow = {
  id: string;
  name: string;
  email: string;
  userId: string;
  roles: string;
  status: string;
};

const PEOPLE_COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.5, minWidth: 200 },
  { key: 'email', label: 'Email', flex: 1.5, minWidth: 220 },
  { key: 'userId', label: 'User ID', flex: 1.2, minWidth: 200 },
  { key: 'roles', label: 'Roles', flex: 1.2, minWidth: 160 },
  { key: 'status', label: 'Status', flex: 0.8, minWidth: 120 },
];

const PEOPLE_TABLE_MIN_WIDTH = PEOPLE_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);

export default function PeopleScreen() {
  const router = useRouter();
  const { ready, memberships, activeOrgId, bootstrap, switchOrg } = useSessionStore();
  const [viewMode, setViewMode] = useState<'members' | 'fosters'>('members');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const {
    data: orgMembers,
    isLoading,
    error,
    refetch,
  } = useOrgMemberships(activeOrgId ?? undefined);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    if (ready && activeOrgId) {
      refetch();
    }
  }, [ready, activeOrgId, refetch]);

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
          Join or create an organization to manage people and housing.
        </Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view people and housing data.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">Failed to load members</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          {(error as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  const rows = useMemo<MemberRow[]>(() => {
    const list = (orgMembers ?? []).map((m) => ({
      id: m.id,
      name: m.user_name,
      email: m.user_email ?? 'email unavailable',
      userId: m.user_id,
      roles: m.roles.join(', ') || 'no roles',
      status: m.active ? 'active' : 'inactive',
      hasRole: {
        foster: m.roles.includes('foster'),
      },
    }));
    const filteredByMode =
      viewMode === 'fosters' ? list.filter((m) => (m.hasRole.foster ? true : false)) : list;
    const term = search.trim().toLowerCase();
    const filtered = term
      ? filteredByMode.filter(
          (m) =>
            m.name.toLowerCase().includes(term) ||
            m.email.toLowerCase().includes(term) ||
            m.userId.toLowerCase().includes(term) ||
            m.roles.toLowerCase().includes(term)
        )
      : filteredByMode;
    return filtered.map(({ hasRole, ...rest }) => rest);
  }, [orgMembers, viewMode, search]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginated = rows.slice(start, start + pageSize);

  return (
    <View className="flex-1 bg-white">
      <PageHeader
        title="People & Homes"
        subtitle="View members by role or focus on fosters and housing."
        actions={[
          <View key="toggle" className="flex-row gap-2">
            {[
              { label: 'All members', value: 'members' as const },
              { label: 'Fosters/Housing', value: 'fosters' as const },
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
        onOpenAdvancedFilters={() => {}}
        filters={[]}
        disableFilters
      />

      <View className="flex-1 relative">
        <DataTable
          columns={PEOPLE_COLUMNS}
          data={paginated}
          minWidth={PEOPLE_TABLE_MIN_WIDTH}
          renderRow={({ item }) => (
            <Pressable
              className="flex-row items-center"
              accessibilityRole="button"
              onPress={() => router.push('/settings' as Href)}
              style={{ width: '100%' }}>
              <Cell flex={1.5} minWidth={200}>
                <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                  {item.name}
                </Text>
              </Cell>
              <Cell flex={1.5} minWidth={220}>
                <Text className="text-xs text-gray-700" numberOfLines={1}>
                  {item.email}
                </Text>
              </Cell>
              <Cell flex={1.2} minWidth={200}>
                <Text className="text-[11px] text-gray-600" numberOfLines={1}>
                  {item.userId}
                </Text>
              </Cell>
              <Cell flex={1.2} minWidth={160}>
                <Text className="text-xs text-gray-700" numberOfLines={1}>
                  {item.roles}
                </Text>
              </Cell>
              <Cell flex={0.8} minWidth={120}>
                <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                  {item.status}
                </Text>
              </Cell>
            </Pressable>
          )}
        />
      </View>

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
              {paginated.length} / {rows.length}
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

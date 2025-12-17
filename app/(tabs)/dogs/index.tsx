import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Filter, Plus, Search } from 'lucide-react-native';

import { DogRow, DogListItem } from '@/components/dogs/DogRow';
import { DOG_TABLE_COLUMNS, TABLE_MIN_WIDTH } from '@/components/dogs/TableConfig';
import { DataTable } from '@/components/table/DataTable';
import { useDogs } from '@/hooks/useDogs';
import { Dog } from '@/schemas/dog';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

const STATUS_FILTERS = ['All', 'In Foster', 'Medical', 'Medical Hold', 'Transport', 'Available'];

export default function DogsListScreen() {
  const { dogList, setDogList } = useUIStore();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(dogList.search);
  const [currentPage, setCurrentPage] = useState(dogList.page || 1);
  const [itemsPerPage, setItemsPerPage] = useState(dogList.pageSize || 10);
  const { activeOrgId, ready, bootstrap, memberships, switchOrg } = useSessionStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDogList({ search: searchInput.trim(), page: 1 });
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput, setDogList]);

  const { data, isLoading, error } = useDogs(activeOrgId ?? undefined, {
    search: dogList.search || undefined,
    status: dogList.status === 'All' ? undefined : dogList.status,
  });

  const list = useMemo<DogListItem[]>(() => (data ?? []).map(toDogListItem), [data]);
  const pageSize = dogList.pageSize || itemsPerPage;
  const page = dogList.page || currentPage;
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginatedList = list.slice(start, start + pageSize);

  const handlePressRow = useCallback(
    (id: string) => {
      router.push(`/dogs/${id}` as Href);
    },
    [router]
  );

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Bootstrapping session...</Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view dogs. If you do not see any, create or join an org.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-start px-6 py-4 border-b border-border">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900 tracking-tight">Dogs</Text>
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={1} ellipsizeMode="tail">
            Manage intake, medical status, transport, and adoption flow.
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            className="flex-row items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg shadow-sm hover:bg-gray-50">
            <Filter size={16} color="#374151" />
            <Text className="text-sm font-medium text-gray-700">Filter</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-2 px-4 py-2 bg-gray-900 rounded-lg shadow-sm hover:bg-gray-800"
            onPress={() => router.push('/dogs/create' as Href)}>
            <Plus size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add Dog</Text>
          </Pressable>
          <OrgSelector
            activeOrgId={activeOrgId}
            memberships={memberships}
            switchOrg={switchOrg}
            ready={ready}
          />
        </View>
      </View>

      <View className="px-6 py-4 bg-white border-b border-border">
        <View className="flex-row items-center gap-4">
          <View className="flex-1 flex-row items-center h-11 px-4 rounded-md border border-border bg-white">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              placeholder="Search by name, ID, or foster..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray-900"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Text className="text-sm text-gray-500">
            Showing <Text className="font-medium text-gray-900">{list.length}</Text> active records
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2 mt-3">
          {STATUS_FILTERS.map((item) => {
            const isActive = dogList.status === item;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  setDogList({ status: item, page: 1 });
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-gray-900 border-gray-900 shadow-sm'
                    : 'bg-white border-border hover:bg-gray-50'
                }`}>
                <Text
                  className={`text-sm ${isActive ? 'text-white font-semibold' : 'text-gray-700'}`}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center bg-surface">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-gray-600">Loading dogs...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center bg-surface px-6">
            <Text className="text-base font-semibold text-gray-900">Failed to load dogs</Text>
            <Text className="mt-2 text-sm text-gray-600 text-center">
              {(error as Error).message || 'Please try again shortly.'}
            </Text>
          </View>
        ) : list.length === 0 ? (
          <View className="flex-1 items-center justify-center bg-surface">
            <Text className="text-sm text-gray-500">No dogs match the current filters.</Text>
          </View>
        ) : (
          <DataTable
            columns={DOG_TABLE_COLUMNS}
            data={paginatedList}
            minWidth={TABLE_MIN_WIDTH}
            renderRow={({ item }) => <DogRow item={item} onPress={() => handlePressRow(item.id)} />}
          />
        )}
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
                    setItemsPerPage(size);
                    setCurrentPage(1);
                    setDogList({ pageSize: size, page: 1 });
                }}
                className={`px-2 py-1 rounded-md border ${
                  active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                }`}>
                <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-gray-700'}`}>
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-sm text-gray-500">
          Page {pageSafe} of {totalPages}
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe <= 1}
            onPress={() => {
              const next = Math.max(1, pageSafe - 1);
              setCurrentPage(next);
              setDogList({ page: next });
            }}
            className={`px-3 py-1 border border-border bg-white rounded text-sm ${
              pageSafe <= 1 ? 'text-gray-400 opacity-60' : 'text-gray-600'
            }`}>
            <Text className="text-sm">Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={pageSafe >= totalPages}
            onPress={() => {
              const next = Math.min(totalPages, pageSafe + 1);
              setCurrentPage(next);
              setDogList({ page: next });
            }}
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

type OrgSelectorProps = {
  activeOrgId: string | null;
  memberships: { org_id: string; org_name: string }[];
  switchOrg: (orgId: string) => void;
  ready: boolean;
};

const OrgSelector = ({ activeOrgId, memberships, switchOrg, ready }: OrgSelectorProps) => {
  const [open, setOpen] = useState(false);

  if (!ready) return null;
  if (!memberships.length) {
    return (
      <View className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-md">
        <Text className="text-xs text-amber-800 font-medium">No memberships found</Text>
      </View>
    );
  }

  const active = memberships.find((m) => m.org_id === activeOrgId) ?? memberships[0];
  const hasChoices = memberships.length > 1;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => hasChoices && setOpen((v) => !v)}
        className="flex-row items-center gap-2 px-3 py-2 rounded-full border border-border bg-white shadow-sm">
        <Text className="text-xs font-semibold text-gray-900">{active.org_name}</Text>
        {hasChoices ? <Text className="text-xs text-gray-500">▾</Text> : null}
      </Pressable>
      {open ? (
        <View className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-white shadow-lg z-10">
          {memberships.map((m) => {
            const isActive = m.org_id === active.org_id;
            return (
              <Pressable
                key={m.org_id}
                accessibilityRole="button"
                onPress={() => {
                  switchOrg(m.org_id);
                  setOpen(false);
                }}
                className={`px-3 py-2 ${isActive ? 'bg-surface' : ''}`}>
                <Text className={`text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {m.org_name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const toDogListItem = (dog: Dog): DogListItem => {
  const extra = dog.extra_fields;
  const attributes = extra.attributes ?? {};

  return {
    id: dog.id,
    name: dog.name,
    internalId: extra.internal_id ?? '',
    status: dog.status,
    breed: attributes.breed,
    sex: attributes.sex,
    age: attributes.age,
    photoUrl: extra.photo_url,
    location: dog.location,
    responsiblePerson: extra.responsible_person,
    budgetSpent: extra.budget_spent ?? 0,
    alerts: extra.alerts ?? [],
    lastUpdate: extra.last_update,
  };
};

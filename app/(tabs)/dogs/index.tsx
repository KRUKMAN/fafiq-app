import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Filter, Plus, Search } from 'lucide-react-native';

import { DogRow, DogListItem } from '@/components/dogs/DogRow';
import { useDogs } from '@/hooks/useDogs';
import { Dog } from '@/schemas/dog';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

const STATUS_FILTERS = ['All', 'In Foster', 'Medical', 'Medical Hold', 'Transport', 'Available'];
const TABLE_MIN_WIDTH = 980;

export default function DogsListScreen() {
  const { setActiveTab } = useUIStore();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>('All');
  const { activeOrgId, ready, bootstrap, memberships, switchOrg } = useSessionStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useDogs(activeOrgId ?? undefined, {
    search: debouncedSearch || undefined,
    status: status === 'All' ? undefined : status,
  });

  const list = useMemo<DogListItem[]>(() => (data ?? []).map(toDogListItem), [data]);

  const handlePressRow = useCallback(
    (id: string) => {
      router.push(`/dogs/${id}` as Href);
      setActiveTab('Overview');
    },
    [router, setActiveTab]
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
          <Text className="text-sm text-gray-500 mt-1">
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
          <Pressable
            accessibilityRole="button"
            className="px-3 py-2 border border-border rounded-md bg-white hover:bg-gray-50"
            onPress={() => setActiveTab('Overview')}>
            <Text className="text-sm font-medium text-gray-700">Go to Detail (Overview)</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-2 mt-3">
          {STATUS_FILTERS.map((item) => {
            const isActive = status === item;
            return (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-1 bg-white"
            contentContainerStyle={{ minWidth: TABLE_MIN_WIDTH }}>
            <FlatList
              style={{ flex: 1 }}
              data={list}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <DogRow item={item} onPress={() => handlePressRow(item.id)} />
              )}
              ListHeaderComponent={<TableHeader />}
              stickyHeaderIndices={[0]}
              ItemSeparatorComponent={() => <View className="h-px bg-border" />}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </ScrollView>
        )}
      </View>

      <View className="border-t border-border px-6 py-3 bg-gray-50 flex-row items-center justify-between">
        <Text className="text-sm text-gray-500">Page 1 of 1</Text>
        <View className="flex-row gap-2">
          <Pressable className="px-3 py-1 border border-border bg-white rounded text-sm text-gray-600 opacity-60">
            <Text className="text-sm text-gray-500">Previous</Text>
          </Pressable>
          <Pressable className="px-3 py-1 border border-border bg-white rounded text-sm text-gray-600">
            <Text className="text-sm text-gray-600">Next</Text>
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
  if (!ready) return null;
  if (!memberships.length) {
    return (
      <View className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-md">
        <Text className="text-xs text-amber-800 font-medium">No memberships found</Text>
      </View>
    );
  }

  return (
    <View className="w-[320px] px-3 py-2 border border-border rounded-lg bg-white">
      <Text className="text-xs text-gray-500 mb-1">Active org</Text>
      <View className="flex-row flex-wrap gap-2">
        {memberships.map((m) => {
          const isActive = m.org_id === activeOrgId;
          return (
            <Pressable
              key={m.org_id}
              onPress={() => switchOrg(m.org_id)}
              className={`px-2 py-1.5 rounded-full border ${
                isActive ? 'bg-gray-900 border-gray-900' : 'bg-surface border-border'
              }`}>
              <Text
                className={`text-[11px] ${
                  isActive ? 'text-white font-semibold' : 'text-gray-800'
                }`}>
                {m.org_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const HeaderCell = ({ label, width, align }: { label: string; width: number; align?: 'right' }) => (
  <View style={{ width }} className="px-6 py-3">
    <Text
      className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${
        align === 'right' ? 'text-right' : ''
      }`}>
      {label}
    </Text>
  </View>
);

const TableHeader = () => (
  <View className="flex-row bg-gray-50 border-b border-border">
    <HeaderCell label="Dog Details" width={320} />
    <HeaderCell label="Status" width={150} />
    <HeaderCell label="Location / Responsible" width={240} />
    <HeaderCell label="Time in Care" width={180} />
    <HeaderCell label="Alerts" width={120} />
    <HeaderCell label="Actions" width={70} align="right" />
  </View>
);

const toDogListItem = (dog: Dog): DogListItem => {
  const extra = dog.extra_fields;
  const attributes = extra.attributes ?? {};
  const daysRaw = (extra as Record<string, unknown>).days_in_care;
  const daysInCare = typeof daysRaw === 'number' ? daysRaw : null;

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
    daysInCare,
    budgetSpent: extra.budget_spent ?? 0,
    alerts: extra.alerts ?? [],
  };
};

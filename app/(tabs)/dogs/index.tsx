import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { AlertTriangle, Filter, Plus, Search } from 'lucide-react-native';

import { useDogs } from '@/hooks/useDogs';
import { Dog } from '@/schemas/dog';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

const STAGES = ['All', 'In Foster', 'Medical', 'Transport'];

export default function DogsListScreen() {
  const { setActiveTab } = useUIStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('All');
  const { activeOrgId, ready, bootstrap } = useSessionStore();
  const { memberships, switchOrg } = useSessionStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  const { data, isLoading } = useDogs(activeOrgId ?? undefined, {
    search,
    status: stage === 'All' ? undefined : stage,
  });

  const list = useMemo(() => data ?? [], [data]);

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-white">
        <Text className="text-xl font-bold text-gray-900">Dogs</Text>
        <View className="flex-row items-center gap-2">
          <OrgSelector
            activeOrgId={activeOrgId}
            memberships={memberships}
            switchOrg={switchOrg}
            ready={ready}
          />
          <Pressable
            className="px-3 py-2 border border-border rounded-md bg-white"
            onPress={() => setActiveTab('Overview')}>
            <Text className="text-sm font-medium text-gray-700">Go to Detail (Overview)</Text>
          </Pressable>
        </View>
      </View>

      <View className="px-4 py-3 bg-white border-b border-border">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center h-11 px-3 rounded-md border border-border bg-surface">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              placeholder="Search by name, ID, or description"
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray-900"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View className="flex-row items-center">
            <Filter size={18} color="#6B7280" />
            <Text className="ml-2 text-sm text-gray-600">Stage</Text>
          </View>
          <Pressable
            className="flex-row items-center gap-2 px-3 py-2 rounded-md bg-gray-900"
            onPress={() => router.push('/dogs/create' as Href)}>
            <Plus size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add dog</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-2 mt-3">
          {STAGES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setStage(item)}
              className={`px-3 py-1.5 rounded-full border ${
                stage === item ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
              }`}>
              <Text
                className={`text-sm ${
                  stage === item ? 'text-white font-semibold' : 'text-gray-700'
                }`}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!ready || isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-gray-600">Loading dogs...</Text>
        </View>
      ) : !activeOrgId ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-gray-900">No active organization</Text>
          <Text className="mt-2 text-sm text-gray-600 text-center">
            Select an organization to view dogs. If you do not see any, create or join an org.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(dog) => dog.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => <DogCard dog={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-sm text-gray-500">No dogs match the current filters.</Text>
            </View>
          }
        />
      )}
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
    <View className="px-3 py-2 border border-border rounded-md bg-white">
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

const DogCard = ({ dog }: { dog: Dog }) => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        router.push(`/dogs/${dog.id}` as never);
      }}
      className="bg-white border border-border rounded-lg p-4 shadow-sm gap-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-base font-semibold text-gray-900">{dog.name}</Text>
        <Text className="text-xs font-semibold text-gray-900 border border-gray-200 px-2 py-1 rounded-full">
          {dog.status}
        </Text>
      </View>
      <Text className="text-xs text-gray-500 font-mono">{dog.extra_fields.internal_id ?? '-'}</Text>
      <Text className="text-sm text-gray-600" numberOfLines={2}>
        {dog.description}
      </Text>
      <View className="flex-row items-center justify-between mt-2">
        <View className="flex-row items-center gap-2">
          <Badge label={dog.location || 'Unknown location'} />
          <Badge label={`Budget $${dog.extra_fields.budget_spent ?? 0}`} />
        </View>
        {dog.extra_fields.alerts && dog.extra_fields.alerts.length > 0 ? (
          <View className="flex-row items-center gap-1">
            <AlertTriangle size={16} color="#b45309" />
            <Text className="text-xs text-amber-700">
              {dog.extra_fields.alerts[0].message ?? 'Alert'}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const Badge = ({ label }: { label: string }) => (
  <View className="px-2 py-1 rounded-md bg-surface border border-border">
    <Text className="text-[11px] font-medium text-gray-700">{label}</Text>
  </View>
);

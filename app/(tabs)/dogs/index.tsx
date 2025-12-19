import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/PageHeader';
import { DogRow, DogListItem } from '@/components/dogs/DogRow';
import { DOG_TABLE_COLUMNS, TABLE_MIN_WIDTH } from '@/components/dogs/TableConfig';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { AdvancedFilterDrawer } from '@/components/table/AdvancedFilterDrawer';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useDogs } from '@/hooks/useDogs';
import { softDeleteDog } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

const STAGE_FILTERS = ['All', 'In Foster', 'Medical', 'Medical Hold', 'Transport', 'Available'];

export default function DogsListScreen() {
  const { dogList, setDogList } = useUIStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(dogList.search);
  const [currentPage, setCurrentPage] = useState(dogList.page || 1);
  const [itemsPerPage, setItemsPerPage] = useState(dogList.pageSize || 10);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [dogToDelete, setDogToDelete] = useState<{ id: string; name: string } | null>(null);
  const { activeOrgId, ready, bootstrap, memberships, switchOrg } = useSessionStore();

  const deleteMutation = useMutation({
    mutationFn: async ({ orgId, dogId }: { orgId: string; dogId: string }) => {
      await softDeleteDog(orgId, dogId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', activeOrgId || ''] });
      setDeleteModalVisible(false);
      setDogToDelete(null);
    },
    onError: (error: any) => {
      console.error('Failed to delete dog:', error?.message);
    },
  });

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
    stage: dogList.stage === 'All' ? undefined : dogList.stage,
    location: dogList.location || undefined,
    responsible: dogList.responsible || undefined,
    hasAlerts: dogList.hasAlerts || undefined,
    updatedAfter: dogList.updatedAfter || undefined,
    updatedBefore: dogList.updatedBefore || undefined,
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

  const handleEditDog = useCallback(
    (id: string) => {
      router.push(`/dogs/${id}/edit` as Href);
    },
    [router]
  );

  const handleViewDogHistory = useCallback(
    (id: string) => {
      // Navigate to dog detail with timeline tab
      router.push(`/dogs/${id}` as Href);
    },
    [router]
  );

  const handleDeleteDog = useCallback(
    (id: string, name: string) => {
      setDogToDelete({ id, name });
      setDeleteModalVisible(true);
    },
    []
  );

  const confirmDeleteDog = useCallback(() => {
    if (!activeOrgId || !dogToDelete) return;
    deleteMutation.mutate({ orgId: activeOrgId, dogId: dogToDelete.id });
  }, [activeOrgId, dogToDelete, deleteMutation]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Bootstrapping session...</Text>
      </View>
    );
  }

  if (ready && memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          You are not a member of any organization. Ask an admin to invite you or create a new org.
        </Text>
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
      <PageHeader
        title="Dogs"
        subtitle="Manage intake, medical status, transport, and adoption flow."
        actions={[
          <Pressable
            key="add-dog"
            accessibilityRole="button"
            className="flex-row items-center gap-2 px-4 py-2 bg-gray-900 rounded-lg shadow-sm hover:bg-gray-800"
            onPress={() => router.push('/dogs/create' as Href)}>
            <Plus size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add Dog</Text>
          </Pressable>,
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
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onOpenAdvancedFilters={() => setDogList({ advancedOpen: true })}
        filters={STAGE_FILTERS.map((label) => ({
          label,
          value: label,
          active: dogList.stage === label,
          onPress: () => {
            setDogList({ stage: label, page: 1 });
            setCurrentPage(1);
          },
        }))}
      />

      <View className="flex-1 relative">
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
            <Text className="text-sm text-gray-600">No dogs match the current filters.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
              setDogList({
                search: '',
                stage: 'All',
                location: '',
                responsible: '',
                hasAlerts: false,
                  updatedAfter: '',
                  updatedBefore: '',
                  page: 1,
                });
                setSearchInput('');
                setCurrentPage(1);
              }}
              className="mt-3 px-4 py-2 rounded-md border border-border bg-white">
              <Text className="text-sm font-semibold text-gray-800">Reset filters</Text>
            </Pressable>
          </View>
        ) : (
          <DataTable
            columns={DOG_TABLE_COLUMNS}
            data={paginatedList}
            minWidth={TABLE_MIN_WIDTH}
            renderRow={({ item }) => (
              <DogRow
                item={item}
                onPress={() => handlePressRow(item.id)}
                onEdit={() => handleEditDog(item.id)}
                onDelete={() => handleDeleteDog(item.id, item.name)}
                onViewHistory={() => handleViewDogHistory(item.id)}
              />
            )}
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

        <View className="items-center">
          <Text className="text-sm text-gray-500">
            Page {pageSafe} of {totalPages}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Showing <Text className="font-medium text-gray-900">{list.length}</Text> active records
          </Text>
        </View>
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

      <AdvancedFilterDrawer
        visible={dogList.advancedOpen}
        onClose={() => setDogList({ advancedOpen: false })}
        filters={{
          location: dogList.location,
          responsible: dogList.responsible,
          hasAlerts: dogList.hasAlerts,
          updatedAfter: dogList.updatedAfter,
          updatedBefore: dogList.updatedBefore,
        }}
        onChangeFilters={(patch) => setDogList(patch)}
        onClear={() => {
          setDogList({
            location: '',
            responsible: '',
            hasAlerts: false,
            updatedAfter: '',
            updatedBefore: '',
            page: 1,
          });
          setCurrentPage(1);
        }}
        onApply={() => {
          setDogList({ page: 1, advancedOpen: false });
          setCurrentPage(1);
        }}
      />

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Dog"
        message={`Are you sure you want to delete "${dogToDelete?.name || 'this dog'}"? This action can be undone by an administrator.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDeleteDog}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDogToDelete(null);
        }}
      />
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
    stage: dog.stage,
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

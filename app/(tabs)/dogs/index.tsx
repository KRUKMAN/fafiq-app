import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
import { DataView } from '@/components/patterns/DataView';
import { OrgSelector } from '@/components/patterns/OrgSelector';
import { Pagination } from '@/components/patterns/Pagination';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const session = useSessionStore();
  const { activeOrgId, memberships, ready, switchOrg } = session;

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

  return (
    <ScreenGuard session={session}>
      <View className="flex-1 bg-white">
        <PageHeader
          title="Dogs"
          subtitle="Manage intake, medical status, transport, and adoption flow."
          actions={[
            <Button
              key="add-dog"
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} color="#fff" />}
              onPress={() => router.push('/dogs/create' as Href)}>
              Add Dog
            </Button>,
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
          <DataView
            data={paginatedList}
            isLoading={isLoading}
            error={error}
            isEmpty={() => list.length === 0}
            loadingLabel="Loading dogs..."
            emptyComponent={
              <View className="flex-1 items-center justify-center bg-surface">
                <EmptyState title="No dogs match the current filters." />
                <Button
                  variant="outline"
                  className="mt-3"
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
                  }}>
                  Reset filters
                </Button>
              </View>
            }>
            {(dogs) => (
              <DataTable
                columns={DOG_TABLE_COLUMNS}
                data={dogs}
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
          </DataView>
        </View>

        <Pagination
          page={pageSafe}
          pageSize={pageSize}
          totalItems={totalItems}
          onChangePage={(next) => {
            setCurrentPage(next);
            setDogList({ page: next });
          }}
          onChangePageSize={(size) => {
            setItemsPerPage(size);
            setDogList({ pageSize: size });
          }}
        />

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
    </ScreenGuard>
  );
}

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

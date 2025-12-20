import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';

import { DogListItem, DogRow } from '@/components/dogs/DogRow';
import { DOG_TABLE_COLUMNS, TABLE_MIN_WIDTH } from '@/components/dogs/TableConfig';
import { OrgSelector } from '@/components/patterns/OrgSelector';
import { StandardListLayout } from '@/components/patterns/StandardListLayout';
import { Button } from '@/components/ui/Button';
import { STRINGS, formatDogDeleteMessage } from '@/constants/strings';
import { UI_COLORS } from '@/constants/uiColors';
import { useDogs } from '@/hooks/useDogs';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { softDeleteDog } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

type DogFilters = {
  search?: string;
  stage?: string;
  location?: string;
  responsible?: string;
  hasAlerts?: boolean;
  updatedAfter?: string;
  updatedBefore?: string;
};

export default function DogsListScreen() {
  const { dogList, setDogList } = useUIStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(dogList.search || '');
  const [currentPage, setCurrentPage] = useState(dogList.page || 1);
  const [itemsPerPage, setItemsPerPage] = useState(dogList.pageSize || 10);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [dogToDelete, setDogToDelete] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const session = useSessionStore();
  const { activeOrgId, memberships, ready, switchOrg } = session;
  const { dogStages } = useOrgSettings(activeOrgId ?? undefined);

  // StandardEntityHook wrapper
  const useDogsStandard = useCallback(
    (orgId: string | undefined, filters: DogFilters) => {
      return useDogs(orgId, {
        search: filters.search || undefined,
        stage: filters.stage === 'All' ? undefined : filters.stage,
        location: filters.location || undefined,
        responsible: filters.responsible || undefined,
        hasAlerts: filters.hasAlerts || undefined,
        updatedAfter: filters.updatedAfter || undefined,
        updatedBefore: filters.updatedBefore || undefined,
      });
    },
    []
  );

  const deleteMutation = useMutation({
    mutationFn: async ({ orgId, dogId }: { orgId: string; dogId: string }) => {
      await softDeleteDog(orgId, dogId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', activeOrgId || ''] });
      setDeleteModalVisible(false);
      setDogToDelete(null);
      setActionError(null);
    },
    onError: (error: any) => {
      setDeleteModalVisible(false);
      setDogToDelete(null);
      setActionError(error?.message ?? 'Failed to delete dog.');
    },
  });

  // Filters state
  const filters: DogFilters = useMemo(
    () => ({
      search: dogList.search,
      stage: dogList.stage,
      location: dogList.location,
      responsible: dogList.responsible,
      hasAlerts: dogList.hasAlerts,
      updatedAfter: dogList.updatedAfter,
      updatedBefore: dogList.updatedBefore,
    }),
    [dogList]
  );

  const handleFiltersChange = useCallback(
    (patch: Partial<DogFilters>) => {
      setDogList(patch as any);
    },
    [setDogList]
  );

  // Quick filters (stage)
  const stageFilters = useMemo(() => {
    const selected = dogList.stage && dogList.stage !== 'All' ? [dogList.stage] : [];
    return Array.from(new Set(['All', ...selected, ...dogStages])).map((label) => ({
      label,
      value: label,
      active: dogList.stage === label,
      onPress: () => {
        setDogList({ stage: label, page: 1 });
        setCurrentPage(1);
      },
    }));
  }, [dogStages, dogList.stage, setDogList]);

  // Handlers
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
      router.push(`/dogs/${id}` as Href);
    },
    [router]
  );

  const handleDeleteDog = useCallback(
    (id: string, name?: string) => {
      if (name) {
        setDogToDelete({ id, name });
        setDeleteModalVisible(true);
      }
    },
    []
  );

  const confirmDeleteDog = useCallback(() => {
    if (!activeOrgId || !dogToDelete) return;
    deleteMutation.mutate({ orgId: activeOrgId, dogId: dogToDelete.id });
  }, [activeOrgId, dogToDelete, deleteMutation]);

  // Get data for totalItems calculation
  const { data } = useDogsStandard(activeOrgId ?? undefined, filters);
  const list = useMemo<DogListItem[]>(() => (data ?? []).map(toDogListItem), [data]);
  const totalItems = list.length;

  return (
    <StandardListLayout
      session={session}
      title={STRINGS.dogs.title}
      subtitle={STRINGS.dogs.subtitle}
      headerActions={[
        <Button
          key="add-dog"
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} color={UI_COLORS.white} />}
          onPress={() => router.push('/dogs/create' as Href)}>
          {STRINGS.dogs.addDog}
        </Button>,
        <OrgSelector
          key="org"
          activeOrgId={activeOrgId}
          memberships={memberships}
          switchOrg={switchOrg}
          ready={ready}
        />,
      ]}
      useEntityHook={useDogsStandard}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      columns={DOG_TABLE_COLUMNS}
      minTableWidth={TABLE_MIN_WIDTH}
      toRowItem={toDogListItem}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchDebounceMs={250}
      quickFilters={stageFilters}
      onOpenAdvancedFilters={() => setDogList({ advancedOpen: true })}
      advancedFilters={{
        visible: dogList.advancedOpen,
        onClose: () => setDogList({ advancedOpen: false }),
        filters: {
          location: dogList.location,
          responsible: dogList.responsible,
          hasAlerts: dogList.hasAlerts,
          updatedAfter: dogList.updatedAfter,
          updatedBefore: dogList.updatedBefore,
        },
        onChangeFilters: (patch) => setDogList(patch as any),
        onClear: () => {
          setDogList({
            location: '',
            responsible: '',
            hasAlerts: false,
            updatedAfter: '',
            updatedBefore: '',
            page: 1,
          });
          setCurrentPage(1);
        },
        onApply: () => {
          setDogList({ page: 1, advancedOpen: false });
          setCurrentPage(1);
        },
      }}
      page={dogList.page || currentPage}
      pageSize={dogList.pageSize || itemsPerPage}
      totalItems={totalItems}
      onPageChange={(next) => {
        setCurrentPage(next);
        setDogList({ page: next });
      }}
      onPageSizeChange={(size) => {
        setItemsPerPage(size);
        setDogList({ pageSize: size });
      }}
      onRowPress={handlePressRow}
      onEdit={handleEditDog}
      onDelete={handleDeleteDog}
      onViewHistory={handleViewDogHistory}
      emptyTitle={STRINGS.dogs.emptyTitle}
      loadingLabel={STRINGS.dogs.loadingDogs}
      emptyActions={
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => {
            setDogList({
              search: '',
              stage: STRINGS.dogs.stageFilters[0],
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
          {STRINGS.dogs.resetFilters}
        </Button>
      }
      actionError={actionError}
      renderRow={({ item, onPress, onEdit, onDelete, onViewHistory }) => {
        const dogItem = item as DogListItem;
        return (
          <DogRow
            item={dogItem}
            onPress={onPress ? () => onPress() : () => {}}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewHistory={onViewHistory}
          />
        );
      }}
      deleteConfirmation={{
        visible: deleteModalVisible,
        title: STRINGS.dogs.deleteTitle,
        message: formatDogDeleteMessage(dogToDelete?.name),
        confirmLabel: STRINGS.dogs.deleteConfirmLabel,
        loading: deleteMutation.isPending,
        onConfirm: confirmDeleteDog,
        onCancel: () => {
          setDeleteModalVisible(false);
          setDogToDelete(null);
        },
      }}
    />
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

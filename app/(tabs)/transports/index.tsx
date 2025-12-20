import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { createTransport, softDeleteTransport, updateTransport } from '@/lib/data/transports';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/patterns/DataView';
import { OrgSelector } from '@/components/patterns/OrgSelector';
import { Pagination } from '@/components/patterns/Pagination';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { STRINGS } from '@/constants/strings';
import { UI_COLORS } from '@/constants/uiColors';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { useTransports } from '@/hooks/useTransports';
import { getPagination } from '@/lib/pagination';
import { Transport } from '@/schemas/transport';
import { useSessionStore } from '@/stores/sessionStore';
import { TransportRow, type TransportRowItem, type TransporterRowItem } from '@/components/transports/TransportRow';
import {
  TransportDetailDrawer,
  TransportEditorDrawer,
  TransporterDetailDrawer,
  formatDateRange,
  type TransportMutationInput,
} from '@/components/transports/TransportsDrawers';



export default function TransportsScreen() {
  const session = useSessionStore();
  const { ready, activeOrgId, memberships, switchOrg } = session;
  const supabaseReady = useMemo(() => Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL), []);
  const params = useLocalSearchParams<{ createDogId?: string; editTransportId?: string }>();
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<'transports' | 'transporters'>('transports');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(null);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [prefillDogId, setPrefillDogId] = useState<string | null>(null);
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState<{ id: string } | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);
  const { transportStatuses } = useOrgSettings(activeOrgId ?? undefined);
  const {
    data: memberData,
    isLoading: membersLoading,
    error: membersError,
  } = useOrgMemberships(activeOrgId ?? undefined);
  const { data: contactData, isLoading: contactsLoading, error: contactsError } = useOrgContacts(activeOrgId ?? undefined);
  const createTransportMutation = useMutation({
    mutationFn: async (values: TransportMutationInput) => {
      if (!activeOrgId) {
        throw new Error('Select an organization before creating a transport.');
      }
      return createTransport({ ...values, org_id: activeOrgId });
    },
    onSuccess: (transport) => {
      queryClient.invalidateQueries({ queryKey: ['transports', activeOrgId || ''] });
      setEditorMode(null);
      setEditingTransportId(null);
      setFormError(null);
      setSelectedTransportId(transport.id);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Unable to save transport.');
    },
  });
  const updateTransportMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TransportMutationInput }) => {
      if (!activeOrgId) {
        throw new Error('Select an organization before saving.');
      }
      return updateTransport(activeOrgId, id, values);
    },
    onSuccess: (transport) => {
      queryClient.invalidateQueries({ queryKey: ['transports', activeOrgId || ''] });
      setEditorMode(null);
      setEditingTransportId(null);
      setFormError(null);
      setSelectedTransportId(transport.id);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Unable to save transport.');
    },
  });

  const deleteTransportMutation = useMutation({
    mutationFn: async ({ orgId, transportId }: { orgId: string; transportId: string }) => {
      await softDeleteTransport(orgId, transportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transports', activeOrgId || ''] });
      setDeleteModalVisible(false);
      setTransportToDelete(null);
      setActionError(null);
    },
    onError: (error: any) => {
      setDeleteModalVisible(false);
      setTransportToDelete(null);
      setActionError(error?.message ?? 'Failed to delete transport.');
    },
  });

  const handleDeleteTransport = useCallback((id: string) => {
    setTransportToDelete({ id });
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteTransport = useCallback(() => {
    if (!activeOrgId || !transportToDelete) return;
    deleteTransportMutation.mutate({ orgId: activeOrgId, transportId: transportToDelete.id });
  }, [activeOrgId, transportToDelete, deleteTransportMutation]);

  const handledCreateDogIdRef = useRef<string | null>(null);
  useEffect(() => {
    const createDogId = Array.isArray(params.createDogId) ? params.createDogId[0] : params.createDogId;
    if (!createDogId) {
      handledCreateDogIdRef.current = null;
      return;
    }
    // Prevent infinite loops if the param can't be cleared (or router/params rehydrate every render).
    if (handledCreateDogIdRef.current === createDogId) return;
    handledCreateDogIdRef.current = createDogId;
    setViewMode('transports');
    setSelectedTransportId(null);
    setSelectedTransporterId(null);
    setFormError(null);
    setPrefillDogId(createDogId);
    setEditorMode('create');
    // Best-effort: clear param so it doesn't re-open on re-render.
    try {
      router.setParams({ createDogId: undefined as any });
    } catch {
      // ignore
    }
  }, [params.createDogId, router]);

  const handledEditTransportIdRef = useRef<string | null>(null);
  useEffect(() => {
    const editTransportId = Array.isArray(params.editTransportId) ? params.editTransportId[0] : params.editTransportId;
    if (!editTransportId) {
      handledEditTransportIdRef.current = null;
      return;
    }
    if (handledEditTransportIdRef.current === editTransportId) return;
    handledEditTransportIdRef.current = editTransportId;
    setViewMode('transports');
    setSelectedTransportId(null);
    setSelectedTransporterId(null);
    setFormError(null);
    setPrefillDogId(null);
    setEditingTransportId(editTransportId);
    setEditorMode('edit');
    try {
      router.setParams({ editTransportId: undefined as any });
    } catch {
      // ignore
    }
  }, [params.editTransportId, router]);

  // Move all computations and useMemo hooks before conditional returns
  const transportRows = useMemo(() => (data || []).map(toTransportRow), [data]);
  const transporterRows = useMemo<TransporterRowItem[]>(() => {
    const transportsRole = 'transport';
    return (memberData || [])
      .filter((m) => m.roles.includes(transportsRole))
      .map((m) => ({
        id: m.id,
        name: m.user_name,
        email: m.user_email || 'email unavailable',
        userId: m.user_id,
        roles: m.roles.join(', ') || 'no roles',
        status: m.active ? 'active' : 'inactive',
      }));
  }, [memberData]);

  const activeRows = viewMode === 'transporters' ? transporterRows : transportRows;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeRows;
    return activeRows.filter((row) =>
      Object.values(row).some((val) => String(val || '').toLowerCase().includes(term))
    );
  }, [activeRows, search]);

  const totalItems = filteredRows.length;
  const pagination = useMemo(
    () => getPagination({ page, pageSize, totalItems }),
    [page, pageSize, totalItems]
  );
  const paginated = useMemo(
    () => filteredRows.slice(pagination.start, pagination.start + pageSize),
    [filteredRows, pagination.start, pageSize]
  );
  const editingTransport = useMemo(
    () => (editingTransportId ? (data || []).find((t) => t.id === editingTransportId) ?? null : null),
    [data, editingTransportId]
  );
  const mutationInFlight = createTransportMutation.isPending || updateTransportMutation.isPending;
  const transporterOptions = useMemo(
    () => transporterRows.map((t) => ({ id: t.id, name: t.name, status: t.status })),
    [transporterRows]
  );
  const contactTransporterOptions = useMemo(
    () =>
      (contactData ?? [])
        .filter((c) => (c.roles ?? []).includes('transport'))
        .map((c) => ({
          id: c.id,
          name: c.display_name,
          status: c.linked_user_id ? 'linked' : 'offline',
        })),
    [contactData]
  );

  const closeEditor = () => {
    setEditorMode(null);
    setEditingTransportId(null);
    setFormError(null);
  };

  useEffect(() => {
    setSelectedTransportId(null);
    setSelectedTransporterId(null);
    closeEditor();
  }, [activeOrgId]);

  const handleSubmitTransport = async (values: TransportMutationInput) => {
    setFormError(null);
    try {
      if (editorMode === 'create') {
        await createTransportMutation.mutateAsync(values);
      } else if (editorMode === 'edit' && editingTransportId) {
        await updateTransportMutation.mutateAsync({ id: editingTransportId, values });
      }
    } catch (err: any) {
      setFormError(err.message || 'Unable to save transport.');
    }
  };

  const toggleControl = (
    <View key="toggle" className="flex-row gap-2">
      {[
        { label: 'Transports', value: 'transports' as const },
        { label: 'Transporters', value: 'transporters' as const },
      ].map((opt) => {
        const active = viewMode === opt.value;
        return (
          <Button
            key={opt.value}
            variant={active ? 'primary' : 'outline'}
            size="sm"
            onPress={() => {
              setViewMode(opt.value);
              setPage(1);
            }}>
            {opt.label}
          </Button>
        );
      })}
    </View>
  );

  const headerActions: React.ReactElement[] = [];
  if (viewMode === 'transports') {
    headerActions.push(
      <Button
        key="add-transport"
        variant="primary"
        leftIcon={<Plus size={16} color={UI_COLORS.white} />}
        onPress={() => {
          setSelectedTransportId(null);
          setFormError(null);
          setEditingTransportId(null);
          setEditorMode('create');
        }}>
        {STRINGS.transports.newTransport}
      </Button>
    );
  }
  headerActions.push(
    toggleControl,
    <OrgSelector
      key="org"
      activeOrgId={activeOrgId}
      memberships={memberships}
      switchOrg={switchOrg}
      ready={ready}
    />
  );

  return (
    <ScreenGuard session={session}>
      <View className="flex-1 bg-background">
        <PageHeader
          title={STRINGS.transports.title}
          subtitle={STRINGS.transports.subtitle}
          actions={headerActions}
        />

        <TableToolbar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          filters={[]}
        />

        <View className="px-6 pt-3">
          <StatusMessage variant="error" message={actionError} />
        </View>

        <View className="flex-1 relative">
          <DataView
            data={paginated}
            isLoading={isLoading || (viewMode === 'transporters' && membersLoading) || contactsLoading}
            error={error || membersError || contactsError}
            isEmpty={() => filteredRows.length === 0}
            loadingLabel={viewMode === 'transporters' ? STRINGS.transports.loadingTransporters : STRINGS.transports.loadingTransports}
            emptyComponent={
              <View className="flex-1 items-center justify-center py-12 px-6">
                <EmptyState
                  title={viewMode === 'transporters' ? STRINGS.transports.emptyTransporters : STRINGS.transports.emptyTransports}
                />
              </View>
            }>
            {(paged) => (
              <DataTable
                columns={viewMode === 'transporters' ? TRANSPORTER_COLUMNS : TRANSPORT_COLUMNS}
                data={paged}
                minWidth={viewMode === 'transporters' ? TRANSPORTER_TABLE_MIN_WIDTH : TRANSPORT_TABLE_MIN_WIDTH}
                renderRow={({ item }) => (
                  <TransportRow
                    item={item}
                    isTransporter={viewMode === 'transporters'}
                    onPress={() => {
                      if (viewMode === 'transporters') {
                        setSelectedTransporterId((item as any).id);
                      } else {
                        setSelectedTransportId((item as any).id);
                      }
                    }}
                    onEdit={
                      viewMode === 'transports'
                        ? () => {
                            const transport = (data || []).find((t) => t.id === (item as any).id);
                            if (transport) {
                              setFormError(null);
                              setEditingTransportId(transport.id);
                              setEditorMode('edit');
                            }
                          }
                        : undefined
                    }
                    onDelete={viewMode === 'transports' ? () => handleDeleteTransport((item as any).id) : undefined}
                    onViewHistory={viewMode === 'transports' ? () => setSelectedTransportId((item as any).id) : undefined}
                  />
                )}
              />
            )}
          </DataView>
        </View>

        <Pagination
          page={pagination.pageSafe}
          pageSize={pageSize}
          totalItems={totalItems}
          onChangePage={setPage}
          onChangePageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        {viewMode === 'transports' ? (
          <>
            <TransportDetailDrawer
              transportId={selectedTransportId}
              transports={data || []}
              onClose={() => setSelectedTransportId(null)}
              onEdit={(transport) => {
                setSelectedTransportId(null);
                setFormError(null);
                setEditingTransportId(transport.id);
                setEditorMode('edit');
              }}
              orgId={activeOrgId}
              supabaseReady={supabaseReady}
              statusOptions={transportStatuses}
            />
            <TransportEditorDrawer
              mode={editorMode}
              transport={editorMode === 'edit' ? editingTransport : null}
              prefillDogId={editorMode === 'create' ? prefillDogId : null}
              onClose={closeEditor}
              onSubmit={handleSubmitTransport}
              submitting={mutationInFlight}
              error={formError}
              statusOptions={transportStatuses}
              transporters={transporterOptions}
              contactTransporters={contactTransporterOptions}
            />
          </>
        ) : (
          <TransporterDetailDrawer
            memberId={selectedTransporterId}
            members={transporterRows}
            onClose={() => setSelectedTransporterId(null)}
            orgId={activeOrgId}
          />
        )}

        <ConfirmationModal
          visible={deleteModalVisible}
          title="Delete Transport"
          message="Are you sure you want to delete this transport? This action can be undone by an administrator."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          loading={deleteTransportMutation.isPending}
          onConfirm={confirmDeleteTransport}
          onCancel={() => {
            setDeleteModalVisible(false);
            setTransportToDelete(null);
          }}
        />
      </View>
    </ScreenGuard>
  );
}

const TRANSPORT_COLUMNS = [
  { key: 'id', label: 'Transport', flex: 1.2, minWidth: 160 },
  { key: 'status', label: 'Status', flex: 1, minWidth: 120 },
  { key: 'from', label: 'From', flex: 1.2, minWidth: 160 },
  { key: 'to', label: 'To', flex: 1.2, minWidth: 160 },
  { key: 'window', label: 'Window', flex: 1.4, minWidth: 180 },
  { key: 'assigned', label: 'Assigned', flex: 1, minWidth: 140 },
  { key: 'actions', label: '', flex: 0.6, minWidth: 60, align: 'right' as const },
];

const TRANSPORT_TABLE_MIN_WIDTH = TRANSPORT_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);

const toTransportRow = (t: Transport): TransportRowItem => ({
  id: t.id,
  status: t.status,
  from: t.from_location || 'Unknown',
  to: t.to_location || 'Unknown',
  window: formatDateRange(t.window_start, t.window_end),
  assigned: t.assigned_membership_id || t.assigned_contact_id || 'Unassigned',
});

const TRANSPORTER_COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.4, minWidth: 200 },
  { key: 'email', label: 'Email', flex: 1.4, minWidth: 200 },
  { key: 'userId', label: 'User ID', flex: 1.2, minWidth: 200 },
  { key: 'roles', label: 'Roles', flex: 1, minWidth: 150 },
  { key: 'status', label: 'Status', flex: 0.8, minWidth: 120 },
];

const TRANSPORTER_TABLE_MIN_WIDTH = TRANSPORTER_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);

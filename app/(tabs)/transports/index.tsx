import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/table/DataTable';
import { TableToolbar } from '@/components/table/TableToolbar';
import { useOrgMemberships } from '@/hooks/useOrgMemberships';
import { createTransport, updateTransport } from '@/lib/data/transports';
import { Transport } from '@/schemas/transport';
import { useSessionStore } from '@/stores/sessionStore';
import { useTransports } from '@/hooks/useTransports';
import { OrgSelector } from './OrgSelector';

const TRANSPORT_STATUS_OPTIONS = ['Requested', 'Scheduled', 'In Progress', 'Done', 'Canceled'];

const transportFormSchema = z.object({
  status: z.string().trim().min(1, 'Status is required'),
  from_location: z.string().trim().min(1, 'From location is required'),
  to_location: z.string().trim().min(1, 'To location is required'),
  assigned_membership_id: z.string().trim().optional(),
  dog_id: z.string().trim().optional(),
  window_start: z.string().trim().optional(),
  window_end: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type TransportFormValues = z.infer<typeof transportFormSchema>;

type TransportMutationInput = {
  status: string;
  from_location: string;
  to_location: string;
  assigned_membership_id: string | null;
  dog_id: string | null;
  window_start: string | null;
  window_end: string | null;
  notes: string | null;
};

const toFormState = (transportto: Transport | null): TransportFormValues => ({
  status: transportto?.status ?? TRANSPORT_STATUS_OPTIONS[0],
  from_location: transportto?.from_location ?? '',
  to_location: transportto?.to_location ?? '',
  assigned_membership_id: transportto?.assigned_membership_id ?? '',
  dog_id: transportto?.dog_id ?? '',
  window_start: transportto?.window_start ?? '',
  window_end: transportto?.window_end ?? '',
  notes: transportto?.notes ?? '',
});

export default function TransportsScreen() {
  const { ready, activeOrgId, memberships, bootstrap, switchOrg } = useSessionStore();
  const [viewMode, setViewMode] = React.useState<'transports' | 'transporters'>('transports');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(null);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);
  const {
    data: memberData,
    isLoading: membersLoading,
    error: membersError,
  } = useOrgMemberships(activeOrgId ?? undefined);
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

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

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
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginated = filteredRows.slice(start, start + pageSize);
  const editingTransport = useMemo(
    () => editingTransportId ? (data || []).find((t) => t.id === editingTransportId) : null,
    [data, editingTransportId]
  );
  const mutationInFlight = createTransportMutation.isPending || updateTransportMutation.isPending;
  const transporterOptions = useMemo(
    () => transporterRows.map((t) => ({ id: t.id, name: t.name, status: t.status })),
    [transporterRows]
  );

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
          {(error as Error).message || (membersError as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  const closeEditor = () => {
    setEditorMode(null);
    setEditingTransportId(null);
    setFormError(null);
  };

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
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const headerActions: React.ReactNode[] = [];
  if (viewMode === 'transports') {
    headerActions.push(
      <Pressable
        key="add-transport"
        accessibilityRole="button"
        className="flex-row items-center gap-2 px-4 py-2 bg-gray-900 rounded-lg shadow-sm"
        onPress={() => {
          setSelectedTransportId(null);
          setFormError(null);
          setEditingTransportId(null);
          setEditorMode('create');
        }}>
        <Plus size={16} color="#fff" />
        <Text className="text-sm font-semibold text-white">New transport</Text>
      </Pressable>
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

  useEffect(() => {
    setSelectedTransportId(null);
    setSelectedTransporterId(null);
    closeEditor();
  }, [activeOrgId]);

  return (
    <View className="flex-1 bg-white">
      <PageHeader
        title="Transports"
        subtitle="View transport events or transporters assigned to your org."
        actions={headerActions}
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
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12 px-6">
            <Text className="text-sm text-gray-600">
              {viewMode === 'transporters'
                ? 'No transporters found for this org.'
                : 'No transports scheduled for this org.'}
            </Text>
          </View>
        }
        renderRow={({ item }) => (
          <TransportRow
            item={item}
            isTransporter={viewMode === 'transporters'}
            onPress={() => {
              if (viewMode === 'transporters') {
                setSelectedTransporterId(item.id);
              } else {
                setSelectedTransportId(item.id);
              }
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
          />
          <TransportEditorDrawer
            mode={editorMode}
            transport={editorMode === 'edit' ? editingTransport : null}
            onClose={closeEditor}
            onSubmit={handleSubmitTransport}
            submitting={mutationInFlight}
            error={formError}
            transporters={transporterOptions}
          />
        </>
      ) : (
        <TransporterDetailDrawer
          memberId={selectedTransporterId}
          members={transporterRows}
          onClose={() => setSelectedTransporterId(null)}
        />
      )}
    </View>
  );
}

const formatDateRange = (start: string | null, end: string | null) => {
  if (!start && !end) return 'Not scheduled';
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const format = (d: Date | null) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
  const startStr = format(startDate);
  const endStr = format(endDate);
  if (startStr && endStr) return `${startStr} to ${endStr}`;
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

type TransporterRowItem = {
  id: string;
  name: string;
  email: string;
  userId: string;
  roles: string;
  status: string;
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
  item: TransportRowItem | TransporterRowItem;
  onPress: () => void;
  isTransporter: boolean;
}) => {
  if (isTransporter) {
    const transporter = item as TransporterRowItem;
    return (
      <View className="flex-row items-center" style={{ width: '100%' }}>
        <Cell flex={1.4} minWidth={200}>
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {transporter.name}
          </Text>
        </Cell>
        <Cell flex={1.4} minWidth={200}>
          <Text className="text-xs text-gray-700" numberOfLines={1}>
            {transporter.email}
          </Text>
        </Cell>
        <Cell flex={1.2} minWidth={200}>
          <Text className="text-[11px] text-gray-600" numberOfLines={1}>
            {transporter.userId}
          </Text>
        </Cell>
        <Cell flex={1} minWidth={150}>
          <Text className="text-xs text-gray-700" numberOfLines={1}>
            {transporter.roles}
          </Text>
        </Cell>
        <Cell flex={0.8} minWidth={120}>
          <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
            {transporter.status}
          </Text>
        </Cell>
      </View>
    );
  }

  const transport = item as TransportRowItem;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center"
      style={{ width: '100%' }}>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
          {transport.id}
        </Text>
      </Cell>
      <Cell flex={1} minWidth={120}>
        <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white" numberOfLines={1}>
          {transport.status}
        </Text>
      </Cell>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm text-gray-800" numberOfLines={1}>
          {transport.from}
        </Text>
      </Cell>
      <Cell flex={1.2} minWidth={160}>
        <Text className="text-sm text-gray-800" numberOfLines={1}>
          {transport.to}
        </Text>
      </Cell>
      <Cell flex={1.4} minWidth={180}>
        <Text className="text-xs text-gray-600" numberOfLines={1}>
          {transport.window}
        </Text>
      </Cell>
      <Cell flex={1} minWidth={140}>
        <Text className="text-xs text-gray-700" numberOfLines={1}>
          {transport.assigned}
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

const SideDrawer = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <View className="absolute inset-0 flex-row z-50" pointerEvents="box-none">
    <Pressable accessibilityRole="button" className="flex-1" onPress={onClose} />
    <View className="ml-auto h-full w-full max-w-5xl bg-white border-l border-border shadow-2xl">{children}</View>
  </View>
);

const TransportDetailDrawer = ({
  transportId,
  transports,
  onClose,
  onEdit,
}: {
  transportId: string | null;
  transports: Transport[];
  onClose: () => void;
  onEdit: (transport: Transport) => void;
}) => {
  if (!transportId) return null;
  const transport = transports.find((t) => t.id === transportId);
  if (!transport) return null;
  return (
    <SideDrawer onClose={onClose}>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold text-gray-900">Transport {transport.id}</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">{transport.status}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onEdit(transport)}
                className="px-3 py-1 rounded-md border border-border bg-white">
                <Text className="text-xs font-semibold text-gray-900">Edit</Text>
              </Pressable>
            </View>
          </View>
          <View className="gap-1">
            <DetailRow label="From" value={transport.from_location || 'Unknown'} />
            <DetailRow label="To" value={transport.to_location || 'Unknown'} />
            <DetailRow label="Window" value={formatDateRange(transport.window_start, transport.window_end)} />
            <DetailRow label="Assigned to" value={transport.assigned_membership_id || 'Unassigned'} />
            <DetailRow label="Dog" value={transport.dog_id || 'Unlinked'} />
            <DetailRow label="Notes" value={transport.notes || ''} />
          </View>
        </View>
      </ScrollView>
    </SideDrawer>
  );
};

const TransportEditorDrawer = ({
  mode,
  transport,
  onClose,
  onSubmit,
  submitting,
  error,
  transporters,
}: {
  mode: 'create' | 'edit' | null;
  transport: Transport | null;
  onClose: () => void;
  onSubmit: (values: TransportMutationInput) => Promise<void>;
  submitting: boolean;
  error: string | null;
  transporters: { id: string; name: string; status: string }[];
}) => {
  const [formState, setFormState] = useState<TransportFormValues>(toFormState());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mode) return;
    setFormState(mode === 'edit' ? toFormState(transport ?? undefined) : toFormState());
    setFieldErrors({});
  }, [mode, transport]);

  if (!mode) return null;
  if (mode === 'edit' && !transport) return null;

  const setField = (key: keyof TransportFormValues, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const validateAndSubmit = async () => {
    setFieldErrors({});
    const parsed = transportFormSchema.safeParse(formState);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') {
          errs[path] = issue.message;
        }
      });
      setFieldErrors(errs);
      return;
    }

    const normalizeText = (val?: string | null) => {
      const trimmed = (val ?? '').trim();
      return trimmed.length ? trimmed : null;
    };
    const normalizeDate = (val?: string | null) => {
      const trimmed = (val ?? '').trim();
      if (!trimmed) return null;
      const parsedDate = new Date(trimmed);
      if (Number.isNaN(parsedDate.getTime())) {
        return undefined;
      }
      return parsedDate.toISOString();
    };

    const windowStart = normalizeDate(parsed.data.window_start);
    const windowEnd = normalizeDate(parsed.data.window_end);
    const dateErrors: Record<string, string> = {};
    if (windowStart === undefined) {
      dateErrors.window_start = 'Use ISO date/time (e.g., 2025-12-20T10:00:00Z).';
    }
    if (windowEnd === undefined) {
      dateErrors.window_end = 'Use ISO date/time (e.g., 2025-12-20T10:00:00Z).';
    }
    if (Object.keys(dateErrors).length) {
      setFieldErrors(dateErrors);
      return;
    }

    const payload: TransportMutationInput = {
      status: parsed.data.status,
      from_location: parsed.data.from_location,
      to_location: parsed.data.to_location,
      assigned_membership_id: normalizeText(parsed.data.assigned_membership_id),
      dog_id: normalizeText(parsed.data.dog_id),
      window_start: windowStart ?? null,
      window_end: windowEnd ?? null,
      notes: normalizeText(parsed.data.notes),
    };

    await onSubmit(payload);
  };

  return (
    <SideDrawer onClose={onClose}>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-lg font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit transport' : 'Create transport'}
            </Text>
            {mode === 'edit' && transport ? (
              <Text className="text-xs text-gray-500 mt-1">Transport ID: {transport.id}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="px-3 py-1 rounded-md border border-border bg-white">
            <Text className="text-xs font-semibold text-gray-900">Close</Text>
          </Pressable>
        </View>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <InputField
          label="From location"
          value={formState.from_location}
          onChangeText={(val) => setField('from_location', val)}
          error={fieldErrors.from_location}
          placeholder="City, state or address"
        />
        <InputField
          label="To location"
          value={formState.to_location}
          onChangeText={(val) => setField('to_location', val)}
          error={fieldErrors.to_location}
          placeholder="Destination"
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-800">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {TRANSPORT_STATUS_OPTIONS.map((status) => {
              const active = formState.status === status;
              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  onPress={() => setField('status', status)}
                  className={`px-3 py-2 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{status}</Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.status ? <Text className="text-xs text-red-600">{fieldErrors.status}</Text> : null}
        </View>

        <InputField
          label="Assigned membership ID"
          value={formState.assigned_membership_id}
          onChangeText={(val) => setField('assigned_membership_id', val)}
          error={fieldErrors.assigned_membership_id}
          placeholder="membership id (optional)"
          helper="Assign to a transporter membership or leave blank to keep unassigned."
        />
        {transporters.length ? (
          <View className="flex-row flex-wrap gap-2">
            {transporters.map((t) => {
              const active = formState.assigned_membership_id === t.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  onPress={() => setField('assigned_membership_id', t.id)}
                  className={`px-3 py-1 rounded-md border ${
                    active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {t.name} {t.status === 'inactive' ? '(inactive)' : ''}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setField('assigned_membership_id', '')}
              className="px-3 py-1 rounded-md border border-border bg-white">
              <Text className="text-xs font-semibold text-gray-800">Clear assignment</Text>
            </Pressable>
          </View>
        ) : null}

        <InputField
          label="Dog ID (optional)"
          value={formState.dog_id}
          onChangeText={(val) => setField('dog_id', val)}
          error={fieldErrors.dog_id}
          placeholder="Link to a dog record"
        />

        <InputField
          label="Window start"
          value={formState.window_start}
          onChangeText={(val) => setField('window_start', val)}
          error={fieldErrors.window_start}
          placeholder="2025-12-20T10:00:00Z"
          helper="Use ISO datetime (UTC) for scheduling."
        />
        <InputField
          label="Window end"
          value={formState.window_end}
          onChangeText={(val) => setField('window_end', val)}
          error={fieldErrors.window_end}
          placeholder="2025-12-20T14:00:00Z"
          helper="Optional; leave blank if timing is flexible."
        />

        <InputField
          label="Notes"
          value={formState.notes}
          onChangeText={(val) => setField('notes', val)}
          error={fieldErrors.notes}
          placeholder="Special instructions"
          multiline
        />

        <View className="flex-row gap-3 pt-2">
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={validateAndSubmit}
            className={`px-4 py-3 rounded-md ${submitting ? 'bg-gray-300' : 'bg-gray-900'}`}>
            <Text className="text-sm font-semibold text-white">
              {submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create transport'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="px-4 py-3 rounded-md border border-border bg-white">
            <Text className="text-sm font-semibold text-gray-900">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SideDrawer>
  );
};

const TransporterDetailDrawer = ({
  memberId,
  members,
  onClose,
}: {
  memberId: string | null;
  members: TransporterRowItem[];
  onClose: () => void;
}) => {
  if (!memberId) return null;
  const member = members.find((m) => m.id === memberId);
  if (!member) return null;
  return (
    <SideDrawer onClose={onClose}>
      <View className="flex-1 bg-white p-6 gap-3">
        <Text className="text-lg font-semibold text-gray-900">{member.name}</Text>
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="User ID" value={member.userId} />
        <DetailRow label="Roles" value={member.roles} />
        <DetailRow label="Status" value={member.status} />
      </View>
    </SideDrawer>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const InputField = ({
  label,
  value,
  onChangeText,
  error,
  helper,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  error?: string;
  helper?: string;
} & React.ComponentProps<typeof TextInput>) => (
  <View className="gap-1">
    <Text className="text-sm font-medium text-gray-800">{label}</Text>
    <TextInput
      {...rest}
      value={value}
      onChangeText={onChangeText}
      className={`min-h-[44px] px-3 py-2 rounded-md border ${
        error ? 'border-red-400' : 'border-border'
      } bg-white text-gray-900`}
      placeholderTextColor="#9CA3AF"
    />
    {helper ? <Text className="text-xs text-gray-500">{helper}</Text> : null}
    {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
  </View>
);

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { LAYOUT_STYLES } from '@/constants/layout';
import { Drawer } from '@/components/patterns/Drawer';
import { TabBar } from '@/components/patterns/TabBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { updateTransport } from '@/lib/data/transports';
import { Transport } from '@/schemas/transport';
import { useDocuments } from '@/hooks/useDocuments';
import { createSignedReadUrl, formatBytes, getObjectMetadata } from '@/lib/data/storage';
import * as Linking from 'expo-linking';

export const TRANSPORT_STATUS_OPTIONS = ['Requested', 'Scheduled', 'In Progress', 'Done', 'Canceled'] as const;

const transportFormSchema = z.object({
  status: z.string().trim().min(1, 'Status is required'),
  from_location: z.string().trim().min(1, 'From location is required'),
  to_location: z.string().trim().min(1, 'To location is required'),
  assigned_membership_id: z.string().trim().optional(),
  assigned_contact_id: z.string().trim().optional(),
  dog_id: z.string().trim().optional(),
  window_start: z.string().trim().optional(),
  window_end: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type TransportFormValues = {
  status: string;
  from_location: string;
  to_location: string;
  assigned_membership_id: string;
  assigned_contact_id: string;
  dog_id: string;
  window_start: string;
  window_end: string;
  notes: string;
};

export type TransportMutationInput = {
  status: string;
  from_location: string;
  to_location: string;
  assigned_membership_id: string | null;
  assigned_contact_id: string | null;
  dog_id: string | null;
  window_start: string | null;
  window_end: string | null;
  notes: string | null;
};

const toFormState = (t: Transport | null): TransportFormValues => ({
  status: t?.status ?? TRANSPORT_STATUS_OPTIONS[0],
  from_location: t?.from_location ?? '',
  to_location: t?.to_location ?? '',
  assigned_membership_id: t?.assigned_membership_id ?? '',
  assigned_contact_id: t?.assigned_contact_id ?? '',
  dog_id: t?.dog_id ?? '',
  window_start: t?.window_start ?? '',
  window_end: t?.window_end ?? '',
  notes: t?.notes ?? '',
});

const shallowEqual = (a: TransportFormValues, b: TransportFormValues) =>
  a.status === b.status &&
  a.from_location === b.from_location &&
  a.to_location === b.to_location &&
  a.assigned_membership_id === b.assigned_membership_id &&
  a.assigned_contact_id === b.assigned_contact_id &&
  a.dog_id === b.dog_id &&
  a.window_start === b.window_start &&
  a.window_end === b.window_end &&
  a.notes === b.notes;

export function TransportEditorDrawer({
  mode,
  transport,
  prefillDogId,
  onClose,
  onSubmit,
  submitting,
  error,
  statusOptions,
  transporters,
  contactTransporters,
}: {
  mode: 'create' | 'edit' | null;
  transport: Transport | null;
  prefillDogId?: string | null;
  onClose: () => void;
  onSubmit: (values: TransportMutationInput) => Promise<void>;
  submitting: boolean;
  error: string | null;
  statusOptions: string[];
  transporters: { id: string; name: string; status: string }[];
  contactTransporters: { id: string; name: string; status: string }[];
}) {
  const effectiveStatusOptions = useMemo(() => {
    const base = statusOptions.length ? statusOptions : [...TRANSPORT_STATUS_OPTIONS];
    const current = transport?.status ? [transport.status] : [];
    return Array.from(new Set([...current, ...base]));
  }, [statusOptions, transport?.status]);

  const [formState, setFormState] = useState<TransportFormValues>(() => {
    const seed = toFormState(null);
    return { ...seed, status: effectiveStatusOptions[0] ?? seed.status };
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mode) return;
    const next = mode === 'edit' ? toFormState(transport ?? null) : toFormState(null);
    if (mode === 'create') next.status = effectiveStatusOptions[0] ?? next.status;
    if (mode === 'create' && prefillDogId) next.dog_id = prefillDogId;
    setFormState((prev) => (shallowEqual(prev, next) ? prev : next));
    setFieldErrors((prev) => (Object.keys(prev).length ? {} : prev));
  }, [mode, transport, prefillDogId, effectiveStatusOptions]);

  if (!mode) return null;
  if (mode === 'edit' && !transport) return null;

  const setField = (key: keyof TransportFormValues, value: string) => {
    setFormState((prev) => {
      if (key === 'assigned_membership_id') return { ...prev, assigned_membership_id: value, assigned_contact_id: '' };
      if (key === 'assigned_contact_id') return { ...prev, assigned_contact_id: value, assigned_membership_id: '' };
      return { ...prev, [key]: value };
    });
  };

  const validateAndSubmit = async () => {
    setFieldErrors({});
    const parsed = transportFormSchema.safeParse(formState);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') errs[path] = issue.message;
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
      if (Number.isNaN(parsedDate.getTime())) return undefined;
      return parsedDate.toISOString();
    };

    const windowStart = normalizeDate(parsed.data.window_start);
    const windowEnd = normalizeDate(parsed.data.window_end);
    const dateErrors: Record<string, string> = {};
    if (windowStart === undefined) dateErrors.window_start = 'Use ISO date/time (e.g., 2025-12-20T10:00:00Z).';
    if (windowEnd === undefined) dateErrors.window_end = 'Use ISO date/time (e.g., 2025-12-20T10:00:00Z).';
    if (Object.keys(dateErrors).length) {
      setFieldErrors(dateErrors);
      return;
    }

    const payload: TransportMutationInput = {
      status: parsed.data.status,
      from_location: parsed.data.from_location,
      to_location: parsed.data.to_location,
      assigned_membership_id: normalizeText(parsed.data.assigned_membership_id),
      assigned_contact_id: normalizeText(parsed.data.assigned_contact_id),
      dog_id: normalizeText(parsed.data.dog_id),
      window_start: windowStart ?? null,
      window_end: windowEnd ?? null,
      notes: normalizeText(parsed.data.notes),
    };

    await onSubmit(payload);
  };

  return (
    <Drawer open={true} onClose={onClose} widthClassName="max-w-5xl">
      <ScrollView className="flex-1 bg-white" contentContainerStyle={LAYOUT_STYLES.scrollScreenPaddedGapped}>
        <View className="flex-row items-start justify-between">
          <View>
            <Typography variant="h3">{mode === 'edit' ? 'Edit transport' : 'Create transport'}</Typography>
            {mode === 'edit' && transport ? (
              <Typography variant="caption" className="mt-1">
                Transport ID: {transport.id}
              </Typography>
            ) : null}
          </View>
          <Button variant="outline" size="sm" onPress={onClose}>
            Close
          </Button>
        </View>

        {error ? <Typography color="error">{error}</Typography> : null}

        <Input
          label="From location"
          value={formState.from_location}
          onChangeText={(val) => setField('from_location', val)}
          error={fieldErrors.from_location}
          placeholder="City, state or address"
        />
        <Input
          label="To location"
          value={formState.to_location}
          onChangeText={(val) => setField('to_location', val)}
          error={fieldErrors.to_location}
          placeholder="Destination"
        />

        <View className="gap-2">
          <Typography className="text-sm font-medium text-gray-800">Status</Typography>
          <View className="flex-row flex-wrap gap-2">
            {effectiveStatusOptions.map((status) => {
              const active = formState.status === status;
              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  onPress={() => setField('status', status)}
                  className={`px-3 py-2 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {status}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.status ? <Typography variant="caption" color="error">{fieldErrors.status}</Typography> : null}
        </View>

        <Input
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
                  className={`px-3 py-1 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {t.name} {t.status === 'inactive' ? '(inactive)' : ''}
                  </Typography>
                </Pressable>
              );
            })}
            <Button variant="outline" size="sm" onPress={() => setField('assigned_membership_id', '')}>
              Clear assignment
            </Button>
          </View>
        ) : null}

        <Input
          label="Assigned contact ID (offline contact)"
          value={formState.assigned_contact_id}
          onChangeText={(val) => setField('assigned_contact_id', val)}
          error={fieldErrors.assigned_contact_id}
          placeholder="contact id (optional)"
          helper="Assign to an offline transporter contact; selecting a contact clears membership assignment."
        />
        {contactTransporters.length ? (
          <View className="flex-row flex-wrap gap-2">
            {contactTransporters.map((t) => {
              const active = formState.assigned_contact_id === t.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  onPress={() => setField('assigned_contact_id', t.id)}
                  className={`px-3 py-1 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                  <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                    {t.name} ({t.status})
                  </Typography>
                </Pressable>
              );
            })}
            <Button variant="outline" size="sm" onPress={() => setField('assigned_contact_id', '')}>
              Clear contact
            </Button>
          </View>
        ) : null}

        <Input
          label="Dog ID (optional)"
          value={formState.dog_id}
          onChangeText={(val) => setField('dog_id', val)}
          error={fieldErrors.dog_id}
          placeholder="Link to a dog record"
        />

        <Input
          label="Window start"
          value={formState.window_start}
          onChangeText={(val) => setField('window_start', val)}
          error={fieldErrors.window_start}
          placeholder="2025-12-20T10:00:00Z"
          helper="Use ISO datetime (UTC) for scheduling."
        />
        <Input
          label="Window end"
          value={formState.window_end}
          onChangeText={(val) => setField('window_end', val)}
          error={fieldErrors.window_end}
          placeholder="2025-12-20T14:00:00Z"
          helper="Optional; leave blank if timing is flexible."
        />

        <Input
          label="Notes"
          value={formState.notes}
          onChangeText={(val) => setField('notes', val)}
          error={fieldErrors.notes}
          placeholder="Special instructions"
          multiline
          className="min-h-[100px]"
        />

        <View className="flex-row gap-3 pt-2">
          <Button variant="primary" onPress={validateAndSubmit} loading={submitting}>
            {mode === 'edit' ? 'Save changes' : 'Create transport'}
          </Button>
          <Button variant="outline" onPress={onClose} disabled={submitting}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </Drawer>
  );
}

const TRANSPORT_DETAIL_TABS = ['Overview', 'Notes', 'Activity'] as const;
const PERSON_DETAIL_TABS = ['Overview', 'Contact', 'Activity'] as const;

export function TransportDetailDrawer({
  transportId,
  transports,
  onClose,
  onEdit,
  statusOptions,
  orgId,
  supabaseReady,
}: {
  transportId: string | null;
  transports: Transport[];
  onClose: () => void;
  onEdit: (transport: Transport) => void;
  statusOptions: string[];
  orgId?: string | null;
  supabaseReady?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<(typeof TRANSPORT_DETAIL_TABS)[number]>('Overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const transport = useMemo(() => transports.find((t) => t.id === transportId) ?? null, [transports, transportId]);
  const effectiveStatusOptions = useMemo(() => {
    const base = statusOptions.length ? statusOptions : [...TRANSPORT_STATUS_OPTIONS];
    const current = transport?.status ? [transport.status] : [];
    return Array.from(new Set([...current, ...base]));
  }, [statusOptions, transport?.status]);
  const [draft, setDraft] = useState({
    from_location: '',
    to_location: '',
    status: effectiveStatusOptions[0] ?? TRANSPORT_STATUS_OPTIONS[0],
    notes: '',
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { data: documents, isLoading: docsLoading, error: docsError } = useDocuments(
    orgId ?? undefined,
    'transport',
    transportId ?? undefined
  );
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!transport) return;
    const nextDraft = {
      from_location: transport.from_location ?? '',
      to_location: transport.to_location ?? '',
      status: transport.status,
      notes: transport.notes ?? '',
    };
    setDraft((prev) =>
      prev.from_location === nextDraft.from_location &&
      prev.to_location === nextDraft.to_location &&
      prev.status === nextDraft.status &&
      prev.notes === nextDraft.notes
        ? prev
        : nextDraft
    );
    setEditing((prev) => (prev ? false : prev));
    setStatusMessage((prev) => (prev !== null ? null : prev));
  }, [transport]);

  useEffect(() => {
    const loadSizes = async () => {
      if (!documents || !documents.length) return;
      const entries = await Promise.all(
        documents.map(async (doc) => {
          const meta = await getObjectMetadata(doc.storage_bucket ?? 'documents', doc.storage_path);
          return [doc.id, meta?.size ?? null] as const;
        })
      );
      setSizes((prev) => {
        const next = { ...prev };
        entries.forEach(([id, size]) => {
          next[id] = size;
        });
        return next;
      });
    };
    void loadSizes();
  }, [documents]);

  const iconForMime = (mime?: string | null, name?: string) => {
    const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
    const m = (mime ?? '').toLowerCase();
    if (m.includes('pdf') || ext === 'pdf') return 'đź§ľ';
    if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'đź–Ľď¸Ź';
    if (m.includes('word') || ['doc', 'docx'].includes(ext)) return 'đź“ť';
    if (['txt', 'md', 'rtf'].includes(ext) || m.includes('text')) return 'đź“„';
    return 'đź“Ž';
  };

  if (!transportId || !transport) return null;

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateTransport(transport.org_id, transport.id, {
        from_location: draft.from_location,
        to_location: draft.to_location,
        status: draft.status,
        notes: draft.notes,
      } as any);
      setEditing(false);
      setStatusMessage('Changes saved.');
    } catch (e: any) {
      setStatusMessage(e?.message ?? 'Unable to save transport');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={true} onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Typography variant="label" className="text-xs font-semibold text-gray-500 tracking-[0.06em]">
                Transport
              </Typography>
              <Typography variant="h3" className="text-xl font-bold text-gray-900">
                {transport.id}
              </Typography>
              <Typography variant="caption" className="text-sm text-gray-500 mt-1">
                {formatDateRange(transport.window_start, transport.window_end)}
              </Typography>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="px-2 py-1 rounded-full bg-primary">
                <Typography variant="caption" className="text-white">
                  {draft.status}
                </Typography>
              </View>
              {editing ? (
                <>
                  <Button variant="primary" size="sm" onPress={handleSave} loading={saving}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onPress={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onPress={() => setEditing(true)}>
                  Edit inline
                </Button>
              )}
              <Button variant="outline" size="sm" onPress={onClose}>
                Close
              </Button>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          {statusMessage ? <Typography variant="caption" className="text-gray-600 mb-2">{statusMessage}</Typography> : null}

          <TabBar tabs={TRANSPORT_DETAIL_TABS} active={activeTab} onChange={setActiveTab} className="mb-6" />

          {activeTab === 'Overview' ? (
            <View className="flex-row flex-wrap gap-4">
              {editing ? (
                <>
                  <EditableRow label="From" value={draft.from_location} onChangeText={(v) => setDraft((p) => ({ ...p, from_location: v }))} />
                  <EditableRow label="To" value={draft.to_location} onChangeText={(v) => setDraft((p) => ({ ...p, to_location: v }))} />
                  <EditableSelect
                    label="Status"
                    value={draft.status}
                    options={effectiveStatusOptions}
                    onSelect={(val) => setDraft((p) => ({ ...p, status: val as any }))}
                  />
                  <EditableRow
                    label="Notes"
                    value={draft.notes}
                    multiline
                    onChangeText={(v) => setDraft((p) => ({ ...p, notes: v }))}
                  />
                </>
              ) : (
                <>
                  <KeyValueCard label="From" value={transport.from_location || 'Unknown'} />
                  <KeyValueCard label="To" value={transport.to_location || 'Unknown'} />
                  <KeyValueCard label="Assigned" value={transport.assigned_membership_id || 'Unassigned'} />
                  <KeyValueCard label="Dog" value={transport.dog_id || 'Unlinked'} />
                  <View className="w-full bg-white border border-border rounded-lg shadow-sm p-3 gap-2">
                    <Typography className="text-sm font-semibold text-gray-900">Documents</Typography>
                    {!supabaseReady ? (
                      <Typography variant="caption" color="muted">Supabase not configured.</Typography>
                    ) : docsLoading ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator size="small" />
                        <Typography variant="caption" color="muted">Loading documents...</Typography>
                      </View>
                    ) : docsError ? (
                      <Typography variant="caption" className="text-red-600">{String((docsError as any)?.message ?? docsError)}</Typography>
                    ) : (documents ?? []).length === 0 ? (
                      <Typography variant="caption" color="muted">No documents yet.</Typography>
                    ) : (
                      <View className="gap-2">
                        {(documents ?? []).map((doc) => (
                          <View key={doc.id} className="flex-row items-center justify-between">
                            <View className="flex-1 pr-2">
                              <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                                {iconForMime(doc.mime_type, doc.filename)} {doc.filename || doc.storage_path.split('/').slice(-1)[0] || 'document'}
                              </Typography>
                              <Typography variant="caption" color="muted">
                                {doc.mime_type || 'unknown'} · {formatBytes(sizes[doc.id])} · {new Date(doc.created_at).toLocaleString()}
                              </Typography>
                            </View>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={openingId === doc.id}
                              loading={openingId === doc.id}
                              onPress={async () => {
                                setOpeningId(doc.id);
                                try {
                                  const url = await createSignedReadUrl('documents', doc.storage_path);
                                  if (!url) throw new Error('Signed URL unavailable');
                                  await Linking.openURL(url);
                                } catch (e: any) {
                                  setStatusMessage(e?.message ?? 'Open failed');
                                } finally {
                                  setOpeningId(null);
                                }
                              }}>
                              Open / Download
                            </Button>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          ) : null}

          {activeTab === 'Notes' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Notes</Typography>
              <Typography className="text-sm text-gray-700 leading-relaxed">
                {transport.notes?.trim() ? transport.notes : 'No notes added yet.'}
              </Typography>
            </View>
          ) : null}

          {activeTab === 'Activity' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Activity</Typography>
              <Typography color="muted">No activity yet.</Typography>
            </View>
          ) : null}

          <View className="mt-6">
            <Button variant="outline" onPress={() => onEdit(transport)}>
              Edit in editor
            </Button>
          </View>
        </View>
      </ScrollView>
    </Drawer>
  );
}

export function TransporterDetailDrawer({
  memberId,
  members,
  onClose,
}: {
  memberId: string | null;
  members: { id: string; name: string; email: string; userId: string; roles: string; status: string }[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<(typeof PERSON_DETAIL_TABS)[number]>('Overview');
  const member = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  if (!memberId || !member) return null;

  return (
    <Drawer open={true} onClose={onClose}>
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white border-b border-border px-4 md:px-8 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Typography variant="label" className="text-xs font-semibold text-gray-500 tracking-[0.06em]">
                Transporter
              </Typography>
              <Typography variant="h3" className="text-xl font-bold text-gray-900">
                {member.name}
              </Typography>
              <Typography variant="body" className="text-sm text-gray-500 mt-1">
                {member.email}
              </Typography>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="px-2 py-1 rounded-full bg-primary">
                <Typography variant="caption" className="text-white">
                  {member.status}
                </Typography>
              </View>
              <Button variant="outline" size="sm" onPress={onClose}>
                Close
              </Button>
            </View>
          </View>
        </View>

        <View className="w-full max-w-5xl self-center px-4 md:px-8 py-6">
          <TabBar tabs={PERSON_DETAIL_TABS} active={activeTab} onChange={setActiveTab} className="mb-6" />

          {activeTab === 'Overview' ? (
            <View className="flex-row flex-wrap gap-4 mb-6">
              <KeyValueCard label="User ID" value={member.userId} />
              <KeyValueCard label="Roles" value={member.roles || 'No roles'} />
              <KeyValueCard label="Status" value={member.status} />
            </View>
          ) : null}

          {activeTab === 'Contact' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Contact</Typography>
              <DetailRow label="Name" value={member.name} />
              <DetailRow label="Email" value={member.email} />
              <DetailRow label="User ID" value={member.userId} />
            </View>
          ) : null}

          {activeTab === 'Activity' ? (
            <View className="bg-white border border-border rounded-lg shadow-sm p-4 gap-3">
              <Typography className="text-sm font-semibold text-gray-900">Activity</Typography>
              <Typography color="muted">No activity yet.</Typography>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Drawer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Typography className="text-sm text-gray-500">{label}</Typography>
      <Typography className="text-sm font-medium text-gray-900" numberOfLines={1}>
        {value}
      </Typography>
    </View>
  );
}

function KeyValueCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[180px] bg-white border border-border rounded-lg p-3 shadow-sm">
      <Typography className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">{label}</Typography>
      <Typography className="text-[13px] font-semibold text-gray-900 mt-1">{value}</Typography>
    </View>
  );
}

function EditableRow({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="flex-1 min-w-[180px] bg-white border border-border rounded-lg p-3 shadow-sm gap-2">
      <Typography className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">{label}</Typography>
      <Input value={value} onChangeText={onChangeText} multiline={multiline} className={multiline ? 'min-h-[88px]' : ''} />
    </View>
  );
}

function EditableSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
}) {
  return (
    <View className="flex-1 min-w-[180px] bg-white border border-border rounded-lg p-3 shadow-sm gap-2">
      <Typography className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">{label}</Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              onPress={() => onSelect(opt)}
              className={`px-3 py-2 rounded-md border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
              <Typography className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{opt}</Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const formatDateRange = (start?: string | null, end?: string | null) => {
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






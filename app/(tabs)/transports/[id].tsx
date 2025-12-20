import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { LAYOUT_STYLES } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { useDocuments } from '@/hooks/useDocuments';
import { createDocumentRecord, deleteDocumentRecord } from '@/lib/data/documents';
import { useTransports } from '@/hooks/useTransports';
import { useSessionStore } from '@/stores/sessionStore';
import { createSignedReadUrl, formatBytes, getObjectMetadata, uploadDocument } from '@/lib/data/storage';
import * as Linking from 'expo-linking';

export default function TransportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transportId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { ready, activeOrgId, memberships, bootstrap } = useSessionStore();
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number | null>>({});
  const { data: documents, isLoading: docsLoading, error: docsError } = useDocuments(
    activeOrgId ?? undefined,
    'transport',
    transportId
  );

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  const transport = useMemo(() => {
    return data?.find((t) => t.id === transportId);
  }, [data, transportId]);

  const iconForMime = (mime?: string | null, name?: string) => {
    const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
    const m = (mime ?? '').toLowerCase();
    if (m.includes('pdf') || ext === 'pdf') return '🧾';
    if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (m.includes('word') || ['doc', 'docx'].includes(ext)) return '📝';
    if (['txt', 'md', 'rtf'].includes(ext) || m.includes('text')) return '📄';
    return '📎';
  };

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

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading session...</Text>
      </View>
    );
  }

  if (ready && memberships.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Join or create an organization to view transports.
        </Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view transports.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading transport...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">Failed to load transports</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          {(error as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  if (!transport) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-sm text-gray-600">Transport not found.</Text>
        <Text className="text-xs text-gray-500 mt-1" onPress={() => router.back()}>
          Go back
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={LAYOUT_STYLES.scrollScreenPaddedGapped}>
      <View className="bg-white border border-border rounded-lg p-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold text-gray-900">Transport {transport.id}</Text>
          <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">{transport.status}</Text>
        </View>
        <View className="gap-1">
          <LabeledValue label="From" value={transport.from_location || 'Unknown'} />
          <LabeledValue label="To" value={transport.to_location || 'Unknown'} />
          <LabeledValue label="Window" value={formatDateRange(transport.window_start, transport.window_end)} />
          <LabeledValue label="Assigned to" value={transport.assigned_membership_id || transport.assigned_contact_id || 'Unassigned'} />
          <LabeledValue label="Dog" value={transport.dog_id || 'Unlinked'} />
          <LabeledValue label="Notes" value={transport.notes || ''} />
        </View>
        <View className="mt-4 gap-2">
          <Text className="text-sm font-semibold text-gray-900">Documents</Text>
          <Text className="text-xs text-gray-600">Upload, view, and delete transport documents.</Text>
          {status ? <Text className="text-xs text-gray-700">{status}</Text> : null}
          {docsError ? <Text className="text-xs text-red-600">{String((docsError as any)?.message ?? docsError)}</Text> : null}
          <View className="flex-row flex-wrap gap-2 items-center">
            <Button
              variant="primary"
              size="sm"
              disabled={uploading || !activeOrgId}
              loading={uploading}
              onPress={async () => {
                if (!activeOrgId) return;
                setUploading(true);
                setStatus(null);
                try {
                  const blob = new Blob(['Sample transport document'], { type: 'text/plain' });
                  const filename = `transport-${transport.id}.txt`;
                  const { path } = await uploadDocument(activeOrgId, 'transport', transport.id, {
                    file: blob,
                    filename,
                    contentType: 'text/plain',
                  });
                  await createDocumentRecord({
                    org_id: activeOrgId,
                    entity_type: 'transport',
                    entity_id: transport.id,
                    storage_path: path,
                    filename,
                    mime_type: 'text/plain',
                  });
                  setStatus(`Uploaded and recorded (${filename})`);
                } catch (e: any) {
                  setStatus(e?.message ?? 'Upload failed');
                } finally {
                  setUploading(false);
                }
              }}>
              Upload sample document
            </Button>
          </View>

          {docsLoading ? (
            <View className="flex-row items-center gap-2 mt-3">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-gray-600">Loading documents...</Text>
            </View>
          ) : null}

          {(documents ?? []).length === 0 ? (
            <Text className="text-sm text-gray-600 mt-2">No documents uploaded yet.</Text>
          ) : (
            <View className="mt-3 gap-2">
              {(documents ?? []).map((doc) => (
                <View
                  key={doc.id}
                  className="flex-row items-center justify-between bg-white border border-border rounded-lg p-3 shadow-sm">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                      {iconForMime(doc.mime_type, doc.filename)} {doc.filename || doc.storage_path.split('/').slice(-1)[0] || 'document'}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {doc.mime_type || 'unknown'} · {formatBytes(sizes[doc.id])} · {new Date(doc.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={openingId === doc.id}
                      loading={openingId === doc.id}
                      onPress={async () => {
                        if (!doc.storage_path) return;
                        setOpeningId(doc.id);
                        setStatus(null);
                        try {
                          const url = await createSignedReadUrl('documents', doc.storage_path);
                          if (!url) throw new Error('Signed URL unavailable');
                          await Linking.openURL(url);
                        } catch (e: any) {
                          setStatus(e?.message ?? 'Open failed');
                        } finally {
                          setOpeningId(null);
                        }
                      }}>
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === doc.id}
                      loading={deletingId === doc.id}
                      onPress={async () => {
                        if (confirmingId !== doc.id) {
                          setConfirmingId(doc.id);
                          setStatus('Tap delete again to confirm.');
                          return;
                        }
                        setDeletingId(doc.id);
                        setStatus(null);
                        try {
                          await deleteDocumentRecord(activeOrgId, doc.id);
                        } catch (e: any) {
                          setStatus(e?.message ?? 'Delete failed');
                        } finally {
                          setDeletingId(null);
                          setConfirmingId(null);
                        }
                      }}>
                      {confirmingId === doc.id ? 'Confirm delete' : 'Delete'}
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const LabeledValue = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-1">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const formatDateRange = (start?: string | null, end?: string | null) => {
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

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTransports } from '@/hooks/useTransports';
import { useSessionStore } from '@/stores/sessionStore';
import { uploadDocument } from '@/lib/data/storage';

export default function TransportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transportId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { ready, activeOrgId, memberships, bootstrap } = useSessionStore();
  const { data, isLoading, error } = useTransports(activeOrgId ?? undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  const transport = useMemo(() => {
    return data?.find((t) => t.id === transportId);
  }, [data, transportId]);

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
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="bg-white border border-border rounded-lg p-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold text-gray-900">Transport {transport.id}</Text>
          <Text className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">{transport.status}</Text>
        </View>
        <View className="gap-1">
          <LabeledValue label="From" value={transport.from_location || 'Unknown'} />
          <LabeledValue label="To" value={transport.to_location || 'Unknown'} />
          <LabeledValue label="Window" value={formatDateRange(transport.window_start, transport.window_end)} />
          <LabeledValue label="Assigned to" value={transport.assigned_membership_id || 'Unassigned'} />
          <LabeledValue label="Dog" value={transport.dog_id || 'Unlinked'} />
          <LabeledValue label="Notes" value={transport.notes || ''} />
        </View>
        <View className="mt-4 gap-2">
          <Text className="text-sm font-semibold text-gray-900">Uploads</Text>
          <Text className="text-xs text-gray-600">
            Upload a sample transport document (uses storage helpers and Supabase Storage).
          </Text>
          {uploadStatus ? <Text className="text-xs text-gray-700">{uploadStatus}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={uploading || !activeOrgId}
            onPress={async () => {
              if (!activeOrgId) return;
              setUploading(true);
              setUploadStatus(null);
              try {
                const blob = new Blob(['Sample transport document'], { type: 'text/plain' });
                const filename = `transport-${transport.id}.txt`;
                const { path } = await uploadDocument(activeOrgId, 'transport', transport.id, {
                  file: blob,
                  filename,
                  contentType: 'text/plain',
                });
                setUploadStatus(`Uploaded to ${path}`);
              } catch (e: any) {
                setUploadStatus(e?.message ?? 'Upload failed');
              } finally {
                setUploading(false);
              }
            }}
            className={`px-4 py-2 rounded-md ${uploading || !activeOrgId ? 'bg-gray-200' : 'bg-gray-900'}`}>
            <Text className="text-sm font-semibold text-white">
              {uploading ? 'Uploading...' : 'Upload sample document'}
            </Text>
          </Pressable>
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

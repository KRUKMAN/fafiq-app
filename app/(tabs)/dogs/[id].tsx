import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Home as HomeIcon,
  MapPin,
  MoreHorizontal,
  User,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Dog } from '@/schemas/dog';
import { TABS, useUIStore } from '@/stores/uiStore';
import { useDog } from '@/hooks/useDog';
import { useDogTimeline } from '@/hooks/useDogTimeline';
import { useSessionStore } from '@/stores/sessionStore';

type DogProfileView = {
  id: string;
  orgId: string;
  name: string;
  status: string;
  medicalStatus: string;
  location: string;
  description: string;
  internalId: string;
  photoUrl?: string;
  responsiblePerson: string;
  fosterName: string | null;
  budgetSpent: number;
  lastUpdate: string;
  attributes: {
    age?: string;
    sex?: 'Male' | 'Female';
    size?: string;
    breed?: string;
    intakeDate?: string;
  };
  alerts: { type: 'warning' | 'error'; message: string }[];
  notes: Note[];
  medicalHistory: MedicalRecord[];
  files: FileItem[];
};

type Note = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type MedicalRecord = {
  id: string;
  title: string;
  status: string;
  date: string;
  doctor?: string;
  notes?: string;
};

type FileItem = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
};

const toDogProfileView = (dog: Dog): DogProfileView => {
  const attributes = dog.extra_fields.attributes ?? {};
  const notes = (dog.extra_fields.notes as Note[] | undefined) ?? [];
  const medicalHistory = (dog.extra_fields.medical_history as MedicalRecord[] | undefined) ?? [];
  const files = (dog.extra_fields.files as FileItem[] | undefined) ?? [];

  return {
    id: dog.id,
    orgId: dog.org_id,
    name: dog.name,
    status: dog.status,
    medicalStatus: dog.medical_status,
    location: dog.location,
    description: dog.description,
    internalId: dog.extra_fields.internal_id ?? '',
    photoUrl: dog.extra_fields.photo_url,
    responsiblePerson: dog.extra_fields.responsible_person ?? '',
    fosterName: dog.extra_fields.foster_name ?? null,
    budgetSpent: dog.extra_fields.budget_spent ?? 0,
    lastUpdate: dog.extra_fields.last_update ?? '',
    attributes: {
      age: attributes.age,
      sex: attributes.sex,
      size: attributes.size,
      breed: attributes.breed,
      intakeDate: attributes.intake_date,
    },
    alerts: dog.extra_fields.alerts ?? [],
    notes,
    medicalHistory,
    files,
  };
};

const renderDrawer = (content: React.ReactNode, onClose: () => void) => (
  <View className="flex-1 bg-black/30">
    <Pressable accessibilityRole="button" className="absolute inset-0" onPress={onClose} />
    <View className="ml-auto h-full w-full max-w-5xl bg-white shadow-2xl">{content}</View>
  </View>
);

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const { activeOrgId, ready, memberships, bootstrap } = useSessionStore();
  const { activeTab, setActiveTab } = useUIStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    setActiveTab('Overview');
  }, [dogId, setActiveTab]);

  const { data, isLoading } = useDog(activeOrgId ?? undefined, dogId ?? undefined);
  const dog = data ? toDogProfileView(data) : null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    if (dog) {
      setNotes(dog.notes ?? []);
    }
  }, [dog]);

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    const newNote: Note = {
      id: `note_${Date.now()}`,
      author: 'You',
      body: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setNoteDraft('');
    setNoteModalOpen(false);
  };

  if (!ready) {
    return renderDrawer(
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading dog profile...</Text>
      </View>,
      () => router.back()
    );
  }

  if (ready && memberships.length === 0) {
    return renderDrawer(
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No memberships found</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Join or create an organization to view dog details.
        </Text>
      </View>,
      () => router.back()
    );
  }

  if (!activeOrgId) {
    return renderDrawer(
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view dog details. If you do not see any, create or join an org.
        </Text>
      </View>,
      () => router.back()
    );
  }

  if (isLoading || !dog) {
    return renderDrawer(
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading dog profile...</Text>
      </View>,
      () => router.back()
    );
  }

  return renderDrawer(
    <View className="flex-1 bg-white">
      <TopBar
        dog={dog}
        onClose={() => router.back()}
      />

      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="w-full max-w-5xl self-center px-4 md:px-8 mt-4">
          <DogHeader dog={dog} onAddNote={() => setNoteModalOpen(true)} />

          <KeyMetrics dog={dog} />

          <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

          {renderTab(activeTab, dog, activeOrgId, notes, () => setNoteModalOpen(true))}
        </View>
      </ScrollView>

      {noteModalOpen ? (
        <NoteModal
          draft={noteDraft}
          onChangeDraft={setNoteDraft}
          onClose={() => setNoteModalOpen(false)}
          onSave={handleAddNote}
        />
      ) : null}
    </View>,
    () => router.back()
  );
}

const renderTab = (
  tab: (typeof TABS)[number],
  dog: DogProfileView,
  activeOrgId: string | null,
  notes: Note[],
  onAddNote: () => void
) => {
  switch (tab) {
    case 'Overview':
      return <OverviewTab dog={dog} notes={notes} onAddNote={onAddNote} />;
    case 'Timeline':
      return activeOrgId ? <TimelineTab orgId={activeOrgId} dogId={dog.id} /> : null;
    case 'Medical':
      return <MedicalTab history={dog.medicalHistory} />;
    case 'Documents':
      return <FilesTab files={dog.files} />;
    default:
      return <PlaceholderTab label={tab} />;
  }
};

const TopBar = ({
  dog,
  onClose,
}: {
  dog: DogProfileView;
  onClose: () => void;
}) => (
  <View className="bg-white border-b border-border px-4 md:px-8 py-3 gap-3">
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-gray-500">
        Dog Detail:{' '}
        <Text className="text-gray-900 font-semibold">
          {dog.name.toUpperCase()} {dog.internalId ? `(${dog.internalId})` : ''}
        </Text>
      </Text>

      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center border border-gray-300">
          <Text className="text-[11px] font-bold text-gray-600">AD</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="w-9 h-9 items-center justify-center border border-border rounded-md bg-white">
          <X size={18} color="#4B5563" />
        </Pressable>
      </View>
    </View>

    <View className="h-1" />
  </View>
);

const DogHeader = ({ dog, onAddNote }: { dog: DogProfileView; onAddNote: () => void }) => (
  <View className="flex-col md:flex-row justify-between gap-6 mb-8">
    <View className="flex-row gap-4">
      {dog.photoUrl ? (
        <Image
          source={{ uri: dog.photoUrl }}
          className="w-24 h-24 rounded-lg bg-gray-200 border border-border"
        />
      ) : (
        <View className="w-24 h-24 rounded-lg bg-gray-200 border border-border items-center justify-center">
          <Text className="text-xs text-gray-500">No photo</Text>
        </View>
      )}
      <View className="justify-center">
        <Text className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{dog.name}</Text>
        <Text className="text-sm text-gray-500 font-mono mb-3">
          Internal ID: {dog.internalId || '-'}
        </Text>
        <Pressable className="flex-row items-center gap-2 bg-white border border-border py-1.5 px-3 rounded-full self-start">
          <HomeIcon size={14} color="#111827" />
          <Text className="text-[13px] font-semibold text-gray-900">{dog.status}</Text>
          <ChevronDown size={12} color="#6B7280" />
        </Pressable>
      </View>
    </View>

    <View className="flex-row flex-wrap gap-2">
      <ActionButton label="Assign foster" />
      <ActionButton label="Create transport" />
      <ActionButton label="Add note" onPress={onAddNote} />
      <ActionButton label="Upload document" />
      <Pressable className="w-10 h-10 items-center justify-center border border-border rounded-md bg-white">
        <MoreHorizontal size={20} color="#6B7280" />
      </Pressable>
    </View>
  </View>
);

const ActionButton = ({ label, onPress }: { label: string; onPress?: () => void }) => (
  <Pressable
    onPress={onPress}
    className="bg-white border border-border py-2 px-4 rounded-md shadow-sm">
    <Text className="text-[13px] font-medium text-gray-900">{label}</Text>
  </Pressable>
);

const KeyMetrics = ({ dog }: { dog: DogProfileView }) => (
  <View className="flex-row flex-wrap gap-4 mb-8">
    <KeyMetric icon={MapPin} label="LOCATION" value={dog.location} />
    <KeyMetric icon={AlertCircle} label="MEDICAL" value={dog.medicalStatus || '-'} />
    <KeyMetric icon={User} label="RESPONSIBLE" value={dog.responsiblePerson || '-'} />
    <KeyMetric icon={HomeIcon} label="FOSTER" value={dog.fosterName || '-'} />
    <KeyMetric icon={DollarSign} label="SPENT" value={`$${dog.budgetSpent}`} />
    <KeyMetric icon={Clock} label="UPDATED" value={dog.lastUpdate || '-'} />
  </View>
);

const KeyMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string | number;
}) => (
  <View className="flex-1 min-w-[180px] flex-row items-center gap-3 bg-white border border-border rounded-lg p-3 shadow-sm">
    <View className="w-9 h-9 items-center justify-center bg-surface rounded-md border border-gray-100">
      <Icon size={16} color="#9CA3AF" />
    </View>
    <View className="flex-1">
      <Text className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">
        {label}
      </Text>
      <Text className="text-[13px] font-semibold text-gray-900">{value}</Text>
    </View>
  </View>
);

const TabsBar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: (typeof TABS)[number];
  setActiveTab: (tab: (typeof TABS)[number]) => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="border-b border-border mb-8"
    contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
    {TABS.map((tab) => (
      <Pressable key={tab} onPress={() => setActiveTab(tab)}>
        <Text
          className={`pb-3 text-sm font-medium border-b-2 ${
            activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
          }`}>
          {tab}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
);

const OverviewTab = ({ dog, notes, onAddNote }: { dog: DogProfileView; notes: Note[]; onAddNote: () => void }) => {
  const alerts = dog.alerts;
  const attributes = dog.attributes;
  const needsFoster = !dog.fosterName;
  const needsMedical = !!dog.medicalStatus && dog.medicalStatus.toLowerCase() !== 'healthy';
  const needsTransport = dog.status.toLowerCase().includes('transport');
  const needsDocuments = false;

  return (
    <View className="flex-col lg:flex-row gap-6">
      <View className="flex-[2] gap-6">
        <Card title="Character & Temperament">
          <Text className="text-sm leading-relaxed text-gray-600">
            {dog.description || 'No description provided yet.'}
          </Text>
        </Card>

        <Card title="Adoption Description">
          <Text className="text-sm leading-relaxed text-gray-600">
            {dog.description || 'No description provided yet.'}
          </Text>
        </Card>

        <Card title="Current Needs">
          <View className="gap-3">
            <CheckRow label="Needs foster" checked={needsFoster} />
            <CheckRow label="Needs transport" checked={needsTransport} />
            <CheckRow label="Needs medical care" checked={needsMedical} />
            <CheckRow label="Needs documents" checked={needsDocuments} />
          </View>
        </Card>
      </View>

      <View className="flex-1 gap-6">
        <Card title="Quick Summary">
          <View className="flex-col divide-y divide-gray-50">
            <SummaryRow label="Age" value={attributes.age ?? '-'} />
            <SummaryRow label="Sex" value={attributes.sex ?? '-'} />
            <SummaryRow label="Size" value={attributes.size ?? '-'} />
            <SummaryRow label="Breed" value={attributes.breed ?? '-'} />
            <SummaryRow label="Intake" value={attributes.intakeDate ?? '-'} />
          </View>
        </Card>

        <Card title="Notes">
          <NotesList notes={notes} onAddNote={onAddNote} />
        </Card>

        <Card title="Alerts">
          <View className="gap-2">
            {alerts.length === 0 ? (
              <Text className="text-sm text-gray-500">No alerts</Text>
            ) : (
              alerts.map((alert, idx) => (
                <View
                  key={idx}
                  className={`flex-row gap-3 p-3 rounded-md items-center border ${
                    alert.type === 'error'
                      ? 'bg-red-50 border-red-100'
                      : 'bg-amber-50 border-amber-100'
                  }`}>
                  {alert.type === 'error' ? (
                    <AlertCircle size={16} color="#b91c1c" />
                  ) : (
                    <AlertTriangle size={16} color="#b45309" />
                  )}
                  <Text
                    className={`text-[13px] font-medium ${
                      alert.type === 'error' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                    {alert.message}
                  </Text>
                </View>
              ))
            )}
          </View>
        </Card>
      </View>
    </View>
  );
};

const TimelineTab = ({ orgId, dogId }: { orgId: string; dogId: string }) => {
  const { data, isLoading, error } = useDogTimeline(orgId, dogId);

  if (isLoading) {
    return (
      <View className="items-center justify-center py-6">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center justify-center py-6">
        <Text className="text-sm font-semibold text-gray-900">Failed to load timeline</Text>
        <Text className="text-xs text-gray-600 mt-1">
          {(error as Error).message || 'Please try again shortly.'}
        </Text>
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View className="items-center justify-center py-6">
        <Text className="text-sm text-gray-600">No activity yet for this dog.</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {data.map((event, idx) => {
        const isLast = idx === data.length - 1;
        return (
          <View key={event.id} className="flex-row gap-3">
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-gray-900 mt-1" />
              {!isLast ? <View className="flex-1 w-px bg-border mt-1" /> : null}
            </View>
            <View className="flex-1 bg-white border border-border rounded-lg p-3 shadow-sm">
              <Text className="text-xs text-gray-500">{formatTimestamp(event.created_at)}</Text>
              <Text className="text-sm font-semibold text-gray-900 mt-1">{event.summary}</Text>
              <Text className="text-[11px] uppercase tracking-wide text-gray-500 mt-1">
                {event.event_type}
              </Text>
              {renderPayload(event.payload)}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const MedicalTab = ({ history }: { history: MedicalRecord[] }) => {
  if (!history.length) {
    return (
      <View className="items-center justify-center py-6">
        <Text className="text-sm text-gray-600">No medical records yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {history.map((record) => (
        <View key={record.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-semibold text-gray-900">{record.title}</Text>
            <Text className="text-xs text-gray-500">{formatDateOnly(record.date)}</Text>
          </View>
          <Text className="text-xs font-medium text-gray-600 mb-2">{record.status}</Text>
          {record.notes ? <Text className="text-sm text-gray-700">{record.notes}</Text> : null}
          {record.doctor ? (
            <Text className="text-xs text-gray-500 mt-2">Doctor: {record.doctor}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const FilesTab = ({ files }: { files: FileItem[] }) => {
  if (!files.length) {
    return (
      <View className="items-center justify-center py-6">
        <Text className="text-sm text-gray-600">No files uploaded yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {files.map((file) => (
        <View key={file.id} className="flex-row items-center justify-between bg-white border border-border rounded-lg p-3 shadow-sm">
          <View>
            <Text className="text-sm font-semibold text-gray-900">{file.name}</Text>
            <Text className="text-xs text-gray-500">
              {file.type} • Uploaded {formatTimestamp(file.uploadedAt)}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">{file.uploadedBy ?? 'Unknown uploader'}</Text>
        </View>
      ))}
    </View>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="bg-white border border-border rounded-lg p-5 shadow-sm">
    <Text className="text-xs font-bold text-gray-900 tracking-[0.08em] uppercase mb-4">
      {title}
    </Text>
    {children}
  </View>
);

const CheckRow = ({ label, checked }: { label: string; checked: boolean }) => (
  <View className="flex-row items-center gap-3">
    <View
      className={`w-5 h-5 border rounded items-center justify-center ${
        checked ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
      }`}>
      {checked ? <Check size={12} color="#fff" /> : null}
    </View>
    <Text className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
      {label}
    </Text>
  </View>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-2.5">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-medium text-gray-900">{value}</Text>
  </View>
);

const NotesList = ({ notes, onAddNote }: { notes: Note[]; onAddNote: () => void }) => (
  <View className="gap-3">
    <Pressable
      accessibilityRole="button"
      onPress={onAddNote}
      className="self-start px-3 py-2 rounded-md border border-border bg-white shadow-sm">
      <Text className="text-sm font-semibold text-gray-900">Add note</Text>
    </Pressable>
    {notes.length === 0 ? (
      <Text className="text-sm text-gray-500">No notes yet.</Text>
    ) : (
      notes.map((note) => (
        <View key={note.id} className="border border-border rounded-md p-3 bg-surface">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-semibold text-gray-900">{note.author}</Text>
            <Text className="text-xs text-gray-500">{formatTimestamp(note.createdAt)}</Text>
          </View>
          <Text className="text-sm text-gray-700">{note.body}</Text>
        </View>
      ))
    )}
  </View>
);

const PlaceholderTab = ({ label }: { label: string }) => (
  <View className="p-10 border-2 border-dashed border-border rounded-lg items-center justify-center">
    <Text className="text-gray-400">Placeholder for {label}</Text>
  </View>
);

const NoteModal = ({
  draft,
  onChangeDraft,
  onSave,
  onClose,
}: {
  draft: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <View className="absolute inset-0 bg-black/30 items-center justify-center px-4">
    <View className="w-full max-w-md bg-white rounded-lg border border-border shadow-2xl p-4 gap-3">
      <View className="flex-row justify-between items-center">
        <Text className="text-base font-semibold text-gray-900">Add note</Text>
        <Pressable accessibilityRole="button" onPress={onClose} className="p-1">
          <X size={18} color="#4B5563" />
        </Pressable>
      </View>
      <TextInput
        value={draft}
        onChangeText={onChangeDraft}
        placeholder="Write a quick note..."
        placeholderTextColor="#9CA3AF"
        multiline
        className="min-h-[100px] border border-border rounded-md px-3 py-2 text-sm text-gray-900"
      />
      <View className="flex-row justify-end gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="px-4 py-2 rounded-md border border-border bg-white">
          <Text className="text-sm text-gray-700">Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          className="px-4 py-2 rounded-md bg-gray-900">
          <Text className="text-sm font-semibold text-white">Save note</Text>
        </Pressable>
      </View>
    </View>
  </View>
);

const renderPayload = (payload: Record<string, unknown>) => {
  const entries = Object.entries(payload ?? {});
  if (!entries.length) return null;
  return (
    <View className="mt-3 gap-1">
      {entries.map(([key, value]) => (
        <View key={key} className="flex-row justify-between">
          <Text className="text-xs text-gray-500">{key}</Text>
          <Text className="text-xs font-medium text-gray-800">{String(value)}</Text>
        </View>
      ))}
    </View>
  );
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

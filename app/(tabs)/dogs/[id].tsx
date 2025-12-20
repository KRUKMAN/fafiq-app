import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Home as HomeIcon,
  MapPin,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';

import { UI_COLORS } from '@/constants/uiColors';
import { LAYOUT_STYLES } from '@/constants/layout';
import { EntityTimeline } from '@/components/patterns/EntityTimeline';
import { NoteModal } from '@/components/dogs/NoteModal';
import { Drawer } from '@/components/patterns/Drawer';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { TabBar } from '@/components/patterns/TabBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDog';
import { useDogPhotos } from '@/hooks/useDogPhotos';
import { useDocuments } from '@/hooks/useDocuments';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import { formatDateOnly, formatTimestampShort } from '@/lib/formatters/dates';
import { updateDog } from '@/lib/data/dogs';
import { createDocumentRecord, deleteDocumentRecord } from '@/lib/data/documents';
import {
  addDogPhotoRecord,
  createSignedReadUrl,
  formatBytes,
  getObjectMetadata,
  uploadDocument,
  uploadDogPhoto,
} from '@/lib/data/storage';
import {
  type DogProfileFileItem as FileItem,
  type DogProfileMedicalRecord as MedicalRecord,
  type DogProfileNote as Note,
  type DogProfileView,
  toDogProfileView,
} from '@/lib/viewModels/dogProfile';
import { useSessionStore } from '@/stores/sessionStore';
import { TABS, useUIStore } from '@/stores/uiStore';

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const { activeOrgId, ready, memberships, bootstrap } = useSessionStore();
  const { activeTab, setActiveTab } = useUIStore();
  const queryClient = useQueryClient();
  const supabaseReady = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    setActiveTab('Overview');
  }, [dogId, setActiveTab]);

  const { data, isLoading } = useDog(activeOrgId ?? undefined, dogId ?? undefined);
  const { data: orgContacts } = useOrgContacts(activeOrgId ?? undefined);
  const dog = useMemo(() => (data ? toDogProfileView(data) : null), [data]);
  const { data: dogPhotos } = useDogPhotos(
    supabaseReady ? activeOrgId ?? undefined : undefined,
    supabaseReady ? (dogId ?? undefined) : undefined
  );
  const primaryPhotoPath = dogPhotos?.[0]?.storage_path ?? null;
  const { data: primaryPhotoUrl } = useQuery({
    queryKey: ['dog-photo-url', activeOrgId ?? '', primaryPhotoPath ?? ''],
    queryFn: () => createSignedReadUrl('dog-photos', primaryPhotoPath!),
    enabled: Boolean(supabaseReady && activeOrgId && primaryPhotoPath),
    staleTime: 1000 * 60 * 30,
  });
  const dogWithPhoto = dog
    ? {
        ...dog,
        photoUrl: primaryPhotoUrl ?? dog.photoUrl,
      }
    : null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignFosterOpen, setAssignFosterOpen] = useState(false);
  const [assignFosterSaving, setAssignFosterSaving] = useState(false);
  const [fosterContactIdDraft, setFosterContactIdDraft] = useState<string>('');
  const [assignFosterError, setAssignFosterError] = useState<string | null>(null);
  const [dogDraft, setDogDraft] = useState({
    name: '',
    stage: '',
    location: '',
    description: '',
    medical_notes: '',
    behavioral_notes: '',
    attributes: {
      age: '',
      sex: '' as '' | 'Male' | 'Female',
      size: '',
      breed: '',
      intake_date: '',
    },
  });

  const fosterOptions = useMemo(
    () =>
      (orgContacts ?? [])
        .filter((c: any) => (c.roles ?? []).includes('foster') && !c.deleted_at)
        .map((c) => ({ id: c.id, name: c.display_name })),
    [orgContacts]
  );

  useEffect(() => {
    if (dog) {
      setNotes(dog.notes ?? []);
      setDogDraft({
        name: dog.name,
        stage: dog.stage,
        location: dog.location,
        description: dog.description,
        medical_notes: dog.medicalNotes ?? '',
        behavioral_notes: dog.behavioralNotes ?? '',
        attributes: {
          age: dog.attributes.age ?? '',
          sex: (dog.attributes.sex as any) ?? '',
          size: dog.attributes.size ?? '',
          breed: dog.attributes.breed ?? '',
          intake_date: (dog.attributes.intakeDate as any) ?? '',
        },
      });
      setEditing(false);
      setSaveError(null);
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

  const handleUploadPhoto = async () => {
    if (!supabaseReady) {
      setPhotoStatus('Supabase is not configured; photo upload is disabled.');
      return;
    }
    if (!activeOrgId || !dog || photoUploading) return;
    setPhotoUploading(true);
    setPhotoStatus(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Media library permission denied.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) {
        setPhotoStatus('Canceled.');
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const filename = (asset.fileName ?? `${dog.name}-${Date.now()}.jpg`).replace(/\s+/g, '-');
      const contentType = asset.mimeType ?? blob.type ?? 'image/jpeg';

      const { path } = await uploadDogPhoto(activeOrgId, dog.id, {
        file: blob,
        filename,
        contentType,
      });
      await addDogPhotoRecord(activeOrgId, dog.id, path, { isPrimary: false });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dog-photos', activeOrgId, dog.id] }),
        queryClient.invalidateQueries({ queryKey: ['dogs', activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ['dog', activeOrgId, dog.id] }),
      ]);
      setPhotoStatus('Photo uploaded.');
    } catch (e: any) {
      setPhotoStatus(e?.message ?? 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const resetDraft = () => {
    if (!dog) return;
    setDogDraft({
      name: dog.name,
      stage: dog.stage,
      location: dog.location,
      description: dog.description,
      medical_notes: dog.medicalNotes ?? '',
      behavioral_notes: dog.behavioralNotes ?? '',
      attributes: {
        age: dog.attributes.age ?? '',
        sex: (dog.attributes.sex as any) ?? '',
        size: dog.attributes.size ?? '',
        breed: dog.attributes.breed ?? '',
        intake_date: (dog.attributes.intakeDate as any) ?? '',
      },
    });
  };

  const handleCancelEdit = () => {
    resetDraft();
    setEditing(false);
    setSaveError(null);
  };

  const handleStartEdit = () => {
    resetDraft();
    setActiveTab('Overview');
    setEditing(true);
    setSaveError(null);
  };

  const handleGoToDocuments = () => {
    setActiveTab('Documents');
  };

  const handleOpenAssignFoster = () => {
    if (!supabaseReady) {
      setSaveError('Supabase is not configured; assignment is disabled.');
      return;
    }
    setAssignFosterError(null);
    setFosterContactIdDraft(data?.foster_contact_id ?? '');
    setAssignFosterOpen(true);
  };

  const handleSaveAssignFoster = async () => {
    if (!supabaseReady || !activeOrgId || !dog || !data) return;
    setAssignFosterSaving(true);
    setAssignFosterError(null);
    try {
      const fosterContact = (orgContacts ?? []).find((c) => c.id === fosterContactIdDraft) ?? null;
      await updateDog(activeOrgId, dog.id, {
        foster_contact_id: fosterContactIdDraft || null,
        extra_fields: {
          ...(data.extra_fields ?? {}),
          foster_name: fosterContact?.display_name ?? null,
        },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dog', activeOrgId, dog.id] }),
        queryClient.invalidateQueries({ queryKey: ['dogs', activeOrgId] }),
      ]);

      setAssignFosterOpen(false);
    } catch (e: any) {
      setAssignFosterError(e?.message ?? 'Unable to assign foster');
    } finally {
      setAssignFosterSaving(false);
    }
  };

  const handleCreateTransport = () => {
    if (!dog) return;
    router.push({ pathname: '/transports', params: { createDogId: dog.id } } as any);
  };

  const handleSaveDog = async () => {
    if (!supabaseReady) {
      setSaveError('Supabase is not configured; editing is disabled.');
      return;
    }
    if (!activeOrgId || !dog) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateDog(activeOrgId, dog.id, {
        name: dogDraft.name.trim() || dog.name,
        stage: dogDraft.stage.trim() || dog.stage,
        location: dogDraft.location,
        description: dogDraft.description,
        medical_notes: dogDraft.medical_notes,
        behavioral_notes: dogDraft.behavioral_notes,
        extra_fields: {
          ...(data?.extra_fields ?? {}),
          attributes: {
            ...(((data?.extra_fields as any)?.attributes as any) ?? {}),
            age: dogDraft.attributes.age || undefined,
            sex: dogDraft.attributes.sex || undefined,
            size: dogDraft.attributes.size || undefined,
            breed: dogDraft.attributes.breed || undefined,
            intake_date: dogDraft.attributes.intake_date || undefined,
          },
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dog', activeOrgId, dog.id] }),
        queryClient.invalidateQueries({ queryKey: ['dogs'] }),
      ]);
      setEditing(false);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Unable to save dog');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={true} onClose={() => router.back()} widthClassName="max-w-5xl">
      <ScreenGuard
        session={{ ready, bootstrap, memberships, activeOrgId }}
        isLoading={isLoading || !dog}
        loadingLabel="Loading dog profile...">
        {!dog ? null : (
          <View className="flex-1 bg-white">
            {editing && (
              <View className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                <Typography variant="caption" className="text-xs text-amber-800">
                  Editing dog details. Save or cancel to exit edit mode.
                </Typography>
              </View>
            )}
            <TopBar dog={dog} onClose={() => router.back()} />

            <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 32 }}>
              <View className="w-full max-w-5xl self-center px-4 md:px-8 mt-4">
                <DogHeader
                  dog={dogWithPhoto ?? dog}
                  onAddNote={() => setNoteModalOpen(true)}
                  onAssignFoster={handleOpenAssignFoster}
                  onCreateTransport={handleCreateTransport}
                  onUploadPhoto={handleUploadPhoto}
                  onUploadDocument={handleGoToDocuments}
                  photoStatus={photoStatus}
                  photoUploading={photoUploading}
                  editing={editing}
                  saving={saving}
                  onEdit={handleStartEdit}
                  onSave={handleSaveDog}
                  onCancel={handleCancelEdit}
                  supabaseReady={supabaseReady}
                />

                <KeyMetrics
                  dog={
                    editing
                      ? {
                          ...dog,
                          stage: dogDraft.stage || dog.stage,
                          location: dogDraft.location,
                        }
                      : dog
                  }
                />

                <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} className="mb-8" />

                {saveError ? <Typography variant="caption" color="error" className="mb-2">{saveError}</Typography> : null}

                {renderTab(
                  activeTab,
                  dog,
                  activeOrgId,
                  supabaseReady,
                  memberships,
                  notes,
                  () => setNoteModalOpen(true),
                  editing,
                  dogDraft,
                  setDogDraft
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScreenGuard>

      {noteModalOpen ? (
        <NoteModal
          draft={noteDraft}
          onChangeDraft={setNoteDraft}
          onClose={() => setNoteModalOpen(false)}
          onSave={handleAddNote}
        />
      ) : null}

      <Modal
        visible={assignFosterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignFosterOpen(false)}>
        <View className="flex-1 bg-black/40 justify-center items-center px-4">
          <View className="w-full max-w-md bg-white rounded-lg p-4 border border-border">
            <Typography variant="h3" className="text-base font-semibold text-gray-900 mb-1">
              Assign foster
            </Typography>
            <Typography variant="caption" color="muted" className="mb-3">
              Select a foster contact and save.
            </Typography>

            <ScrollView className="max-h-[240px]" contentContainerStyle={LAYOUT_STYLES.compactGapped}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFosterContactIdDraft('')}
                className={`px-3 py-2 rounded-md border ${
                  !fosterContactIdDraft ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                }`}>
                <Typography
                  variant="bodySmall"
                  className={`text-xs font-semibold ${!fosterContactIdDraft ? 'text-white' : 'text-gray-800'}`}>
                  Unassigned
                </Typography>
              </Pressable>

              {fosterOptions.map((opt) => {
                const active = opt.id === fosterContactIdDraft;
                return (
                  <Pressable
                    key={opt.id}
                    accessibilityRole="button"
                    onPress={() => setFosterContactIdDraft(opt.id)}
                    className={`px-3 py-2 rounded-md border ${
                      active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                    }`}>
                    <Typography
                      variant="bodySmall"
                      className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                      {opt.name}
                    </Typography>
                  </Pressable>
                );
              })}
            </ScrollView>

            {assignFosterError ? (
              <Typography variant="caption" color="error" className="mt-2">
                {assignFosterError}
              </Typography>
            ) : null}

            <View className="flex-row justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onPress={() => setAssignFosterOpen(false)} disabled={assignFosterSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={handleSaveAssignFoster}
                disabled={assignFosterSaving}
                loading={assignFosterSaving}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Drawer>
  );
}

const renderTab = (
  tab: (typeof TABS)[number],
  dog: DogProfileView,
  activeOrgId: string | null,
  supabaseReady: boolean,
  memberships: { id: string; org_id: string; roles: string[]; active: boolean }[],
  notes: Note[],
  onAddNote: () => void,
  editing: boolean,
  dogDraft: {
    name: string;
    stage: string;
    location: string;
    description: string;
    medical_notes: string;
    behavioral_notes: string;
    attributes: {
      age: string;
      sex: '' | 'Male' | 'Female';
      size: string;
      breed: string;
      intake_date: string;
    };
  },
  setDogDraft: React.Dispatch<
    React.SetStateAction<{
      name: string;
      stage: string;
      location: string;
      description: string;
      medical_notes: string;
      behavioral_notes: string;
      attributes: {
        age: string;
        sex: '' | 'Male' | 'Female';
        size: string;
        breed: string;
        intake_date: string;
      };
    }>
  >
) => {
  switch (tab) {
    case 'Overview':
      return (
        <OverviewTab
          dog={dog}
          notes={notes}
          onAddNote={onAddNote}
          editing={editing}
          dogDraft={dogDraft}
          setDogDraft={setDogDraft}
        />
      );
    case 'Timeline':
      return activeOrgId ? <EntityTimeline orgId={activeOrgId} scope={{ kind: 'dog', dogId: dog.id }} scrollable={false} /> : null;
    case 'Medical':
      return <MedicalTab history={dog.medicalHistory} />;
    case 'Documents':
      return <FilesTab orgId={activeOrgId} dogId={dog.id} memberships={memberships} supabaseReady={supabaseReady} />;
    case 'Financial':
      return <FinancialTab spent={dog.budgetSpent} limit={dog.budgetLimit} />;
    case 'People & Housing':
      return <PeopleHousingTab dog={dog} />;
    case 'Chat':
      return <ChatTab />;
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
      <Typography variant="body" color="muted" className="text-sm font-medium">
        Dog Detail:{' '}
        <Typography variant="body" className="text-gray-900 font-semibold">
          {dog.name.toUpperCase()} {dog.internalId ? `(${dog.internalId})` : ''}
        </Typography>
      </Typography>

      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center border border-gray-300">
          <Typography variant="caption" className="text-[11px] font-bold text-gray-600">
            AD
          </Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="w-9 h-9 items-center justify-center border border-border rounded-md bg-white">
          <X size={18} color={UI_COLORS.muted} />
        </Pressable>
      </View>
    </View>

    <View className="h-1" />
  </View>
);

const DogHeader = ({
  dog,
  onAddNote,
  onAssignFoster,
  onCreateTransport,
  onUploadPhoto,
  onUploadDocument,
  photoStatus,
  photoUploading,
  editing,
  saving,
  onEdit,
  onSave,
  onCancel,
  supabaseReady,
}: {
  dog: DogProfileView;
  onAddNote: () => void;
  onAssignFoster: () => void;
  onCreateTransport: () => void;
  onUploadPhoto: () => void;
  onUploadDocument: () => void;
  photoStatus: string | null;
  photoUploading: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  supabaseReady: boolean;
}) => (
  <View className="flex-col md:flex-row justify-between gap-6 mb-8">
    <View className="flex-row gap-4">
      {dog.photoUrl ? (
        <Image
          source={{ uri: dog.photoUrl }}
          className="w-24 h-24 rounded-lg bg-gray-200 border border-border"
        />
      ) : (
        <View className="w-24 h-24 rounded-lg bg-gray-200 border border-border items-center justify-center">
          <Typography variant="caption" color="muted">No photo</Typography>
        </View>
      )}
      <View className="justify-center">
        <Typography variant="h1" className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
          {dog.name}
        </Typography>
        <Typography variant="body" color="muted" className="text-sm font-mono mb-3">
          Internal ID: {dog.internalId || '-'}
        </Typography>
        <View className="flex-row items-center gap-2 bg-white border border-border py-1.5 px-3 rounded-full self-start">
          <HomeIcon size={14} color={UI_COLORS.foreground} />
          <Typography variant="body" className="text-[13px] font-semibold text-gray-900">
            {dog.stage}
          </Typography>
        </View>
      </View>
    </View>

    <View className="flex-row flex-wrap gap-2">
      {editing ? (
        <>
          <ActionButton label={saving ? 'Saving...' : 'Save'} onPress={onSave} disabled={!supabaseReady || saving} />
          <ActionButton label="Cancel" onPress={onCancel} disabled={saving} />
        </>
      ) : (
        <ActionButton label="Edit" onPress={onEdit} disabled={!supabaseReady} />
      )}
      <ActionButton label="Assign foster" onPress={onAssignFoster} disabled={!supabaseReady} />
      <ActionButton label="Create transport" onPress={onCreateTransport} disabled={!supabaseReady} />
      <ActionButton label="Add note" onPress={onAddNote} />
      <ActionButton
        label={photoUploading ? 'Uploading...' : 'Upload photo'}
        onPress={onUploadPhoto}
        disabled={!supabaseReady || photoUploading}
      />
      <ActionButton label="Upload document" onPress={onUploadDocument} />
    </View>
    {photoStatus ? <Typography variant="caption" color="muted" className="text-xs">{photoStatus}</Typography> : null}
  </View>
);

const ActionButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <Button variant="outline" size="sm" onPress={onPress} disabled={disabled}>
    {label}
  </Button>
);

const KeyMetrics = ({ dog }: { dog: DogProfileView }) => (
  <View className="flex-row flex-wrap gap-4 mb-8">
    <KeyMetric icon={MapPin} label="LOCATION" value={dog.location} />
    <KeyMetric icon={AlertCircle} label="MEDICAL" value={dog.medicalNotes || '-'} />
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
      <Icon size={16} color={UI_COLORS.mutedForeground} />
    </View>
    <View className="flex-1">
      <Typography variant="label" className="text-[11px] font-bold text-gray-400 tracking-[0.08em] uppercase">
        {label}
      </Typography>
      <Typography variant="body" className="text-[13px] font-semibold text-gray-900">
        {value}
      </Typography>
    </View>
  </View>
);

const OverviewTab = ({
  dog,
  notes,
  onAddNote,
  editing,
  dogDraft,
  setDogDraft,
}: {
  dog: DogProfileView;
  notes: Note[];
  onAddNote: () => void;
  editing: boolean;
  dogDraft: {
    name: string;
    stage: string;
    location: string;
    description: string;
    medical_notes: string;
    behavioral_notes: string;
    attributes: {
      age: string;
      sex: '' | 'Male' | 'Female';
      size: string;
      breed: string;
      intake_date: string;
    };
  };
  setDogDraft: React.Dispatch<
    React.SetStateAction<{
      name: string;
      stage: string;
      location: string;
      description: string;
      medical_notes: string;
      behavioral_notes: string;
      attributes: {
        age: string;
        sex: '' | 'Male' | 'Female';
        size: string;
        breed: string;
        intake_date: string;
      };
    }>
  >;
}) => {
  const viewDog = editing
    ? {
        ...dog,
        name: dogDraft.name || dog.name,
        stage: dogDraft.stage || dog.stage,
        location: dogDraft.location,
        description: dogDraft.description,
        medicalNotes: dogDraft.medical_notes,
        behavioralNotes: dogDraft.behavioral_notes,
      }
    : dog;

  const alerts = viewDog.alerts;
  const attributes = viewDog.attributes;
  const needsFoster = !viewDog.fosterName;
  const needsMedical = !!viewDog.medicalNotes && viewDog.medicalNotes.toLowerCase() !== 'healthy';
  const needsTransport = viewDog.stage.toLowerCase().includes('transport');
  const needsDocuments = false;

  return (
    <View className="flex-col lg:flex-row gap-6">
      <View className="flex-[2] gap-6">
        <Card title="Basic Info">
          <View className="gap-3">
            {editing ? (
              <>
                <InputRow
                  label="Name"
                  value={dogDraft.name}
                  onChangeText={(val) => setDogDraft((p) => ({ ...p, name: val }))}
                  placeholder="Dog name"
                />
                <InputRow
                  label="Stage"
                  value={dogDraft.stage}
                  onChangeText={(val) => setDogDraft((p) => ({ ...p, stage: val }))}
                  placeholder="Intake, In Foster, Adopted..."
                />
                <InputRow
                  label="Location"
                  value={dogDraft.location}
                  onChangeText={(val) => setDogDraft((p) => ({ ...p, location: val }))}
                  placeholder="City / region"
                />
              </>
            ) : (
              <>
                <SummaryRow label="Name" value={viewDog.name} />
                <SummaryRow label="Stage" value={viewDog.stage} />
                <SummaryRow label="Location" value={viewDog.location} />
              </>
            )}
          </View>
        </Card>

        <Card title="Character & Temperament">
          {editing ? (
            <TextInput
              value={dogDraft.description}
              onChangeText={(val) => setDogDraft((p) => ({ ...p, description: val }))}
              placeholder="Describe personality, behavior, background"
              multiline
              className="border border-border rounded-lg px-3 py-2 text-sm min-h-[100px]"
            />
          ) : (
            <Typography variant="body" color="muted" className="leading-relaxed">
              {viewDog.description || 'No description provided yet.'}
            </Typography>
          )}
        </Card>

        <Card title="Medical Notes">
          {editing ? (
            <TextInput
              value={dogDraft.medical_notes}
              onChangeText={(val) => setDogDraft((p) => ({ ...p, medical_notes: val }))}
              placeholder="Medical notes"
              multiline
              className="border border-border rounded-lg px-3 py-2 text-sm min-h-[80px]"
            />
          ) : (
            <Typography variant="body" color="muted" className="leading-relaxed">
              {viewDog.medicalNotes || 'No medical notes yet.'}
            </Typography>
          )}
        </Card>

        <Card title="Behavioral Notes">
          {editing ? (
            <TextInput
              value={dogDraft.behavioral_notes}
              onChangeText={(val) => setDogDraft((p) => ({ ...p, behavioral_notes: val }))}
              placeholder="Behavioral notes"
              multiline
              className="border border-border rounded-lg px-3 py-2 text-sm min-h-[80px]"
            />
          ) : (
            <Typography variant="body" color="muted" className="leading-relaxed">
              {viewDog.behavioralNotes?.trim() ? viewDog.behavioralNotes : 'No behavioral notes yet.'}
            </Typography>
          )}
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
          {editing ? (
            <View className="gap-3">
              <InputRow
                label="Age"
                value={dogDraft.attributes.age}
                onChangeText={(val) =>
                  setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, age: val } }))
                }
                placeholder="e.g. 2 years"
              />
              <View className="gap-1">
                <Typography variant="label" className="text-xs font-semibold text-gray-500 uppercase tracking-[0.08em]">
                  Sex
                </Typography>
                <View className="flex-row flex-wrap gap-2">
                  {(['Male', 'Female'] as const).map((sex) => {
                    const active = dogDraft.attributes.sex === sex;
                    return (
                      <Pressable
                        key={sex}
                        accessibilityRole="button"
                        onPress={() =>
                          setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, sex } }))
                        }
                        className={`px-3 py-2 rounded-md border ${
                          active ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                        }`}>
                        <Typography
                          variant="bodySmall"
                          className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>
                          {sex}
                        </Typography>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, sex: '' } }))
                    }
                    className={`px-3 py-2 rounded-md border ${
                      !dogDraft.attributes.sex ? 'bg-gray-900 border-gray-900' : 'bg-white border-border'
                    }`}>
                    <Typography
                      variant="bodySmall"
                      className={`text-xs font-semibold ${!dogDraft.attributes.sex ? 'text-white' : 'text-gray-800'}`}>
                      Unknown
                    </Typography>
                  </Pressable>
                </View>
              </View>
              <InputRow
                label="Size"
                value={dogDraft.attributes.size}
                onChangeText={(val) =>
                  setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, size: val } }))
                }
                placeholder="e.g. Medium"
              />
              <InputRow
                label="Breed"
                value={dogDraft.attributes.breed}
                onChangeText={(val) =>
                  setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, breed: val } }))
                }
                placeholder="e.g. Mixed"
              />
              <InputRow
                label="Intake date"
                value={dogDraft.attributes.intake_date}
                onChangeText={(val) =>
                  setDogDraft((p) => ({ ...p, attributes: { ...p.attributes, intake_date: val } }))
                }
                placeholder="YYYY-MM-DD"
              />
            </View>
          ) : (
            <View className="flex-col divide-y divide-gray-50">
              <SummaryRow label="Age" value={attributes.age ?? '-'} />
              <SummaryRow label="Sex" value={attributes.sex ?? '-'} />
              <SummaryRow label="Size" value={attributes.size ?? '-'} />
              <SummaryRow label="Breed" value={attributes.breed ?? '-'} />
              <SummaryRow label="Intake" value={attributes.intakeDate ?? '-'} />
            </View>
          )}
        </Card>

        <Card title="Notes">
          <NotesList notes={notes} onAddNote={onAddNote} />
        </Card>

        <Card title="Alerts">
          <View className="gap-2">
            {alerts.length === 0 ? (
              <Typography variant="body" color="muted">No alerts</Typography>
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
                    <AlertCircle size={16} color={UI_COLORS.destructive} />
                  ) : (
                    <AlertTriangle size={16} color={UI_COLORS.warning} />
                  )}
                  <Typography
                    variant="body"
                    className={`text-[13px] font-medium ${
                      alert.type === 'error' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                    {alert.message}
                  </Typography>
                </View>
              ))
            )}
          </View>
        </Card>
      </View>
    </View>
  );
};

const MedicalTab = ({ history }: { history: MedicalRecord[] }) => {
  if (!history.length) {
    return (
      <View className="items-center justify-center py-6">
        <Typography variant="body" color="muted">No medical records yet.</Typography>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {history.map((record) => (
          <View key={record.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Typography variant="body" className="text-sm font-semibold text-gray-900">
                {record.title}
              </Typography>
              <Typography variant="caption" color="muted">{formatDateOnly(record.date)}</Typography>
            </View>
          <Typography variant="bodySmall" className="text-xs font-medium text-gray-600 mb-2">
            {record.status}
          </Typography>
          {record.notes ? <Typography variant="body" className="text-sm text-gray-700">{record.notes}</Typography> : null}
          {record.doctor ? (
            <Typography variant="caption" color="muted" className="mt-2">
              Doctor: {record.doctor}
            </Typography>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const FilesTab = ({
  orgId,
  dogId,
  memberships,
  supabaseReady,
}: {
  orgId: string | null;
  dogId: string;
  memberships: { id: string; org_id: string; roles: string[]; active: boolean }[];
  supabaseReady: boolean;
}) => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number | null>>({});
  const queryClient = useQueryClient();
  const { data: documents, isLoading, error } = useDocuments(orgId ?? undefined, 'dog', dogId);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.org_id === orgId && m.active) ?? null,
    [memberships, orgId]
  );

  const files = useMemo<FileItem[]>(() => {
    return (documents ?? []).map((doc) => ({
      id: doc.id,
      name: doc.filename ?? doc.storage_path.split('/').slice(-1)[0] ?? 'document',
      type: doc.mime_type ?? 'unknown',
      uploadedAt: doc.created_at,
      uploadedBy:
        activeMembership && doc.created_by_membership_id && doc.created_by_membership_id === activeMembership.id
          ? 'You'
          : doc.created_by_membership_id
            ? 'Member'
            : undefined,
      size: sizes[doc.id],
    }));
  }, [documents, activeMembership, sizes]);

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
    if (m.includes('pdf') || ext === 'pdf') return '🧾';
    if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (m.includes('word') || ['doc', 'docx'].includes(ext)) return '📝';
    if (['txt', 'md', 'rtf'].includes(ext) || m.includes('text')) return '📄';
    return '📎';
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Typography variant="body" className="text-sm font-semibold text-gray-900">
          Files
        </Typography>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading || !orgId || !supabaseReady}
          loading={uploading}
          onPress={async () => {
            if (!orgId || !supabaseReady) return;
            setUploading(true);
            setStatus(null);
            try {
              const blob = new Blob(['Dog document'], { type: 'text/plain' });
              const filename = `dog-${Date.now()}.txt`;
              const { path } = await uploadDocument(orgId, 'dog', dogId, {
                file: blob,
                filename,
                contentType: 'text/plain',
              });
              await createDocumentRecord({
                org_id: orgId,
                entity_type: 'dog',
                entity_id: dogId,
                storage_path: path,
                filename,
                mime_type: 'text/plain',
              });
              await queryClient.invalidateQueries({ queryKey: ['documents', orgId, 'dog', dogId] });
              await queryClient.invalidateQueries({ queryKey: ['dog-timeline', orgId, dogId] });
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
      {status ? <Typography variant="caption" color="muted">{status}</Typography> : null}
      {error ? (
        <Typography variant="caption" className="text-red-600">
          {String((error as any)?.message ?? error)}
        </Typography>
      ) : null}
      {isLoading ? (
        <View className="items-center justify-center py-6">
          <ActivityIndicator />
        </View>
      ) : files.length === 0 ? (
        <View className="items-center justify-center py-6">
          <Typography variant="body" color="muted">No files uploaded yet.</Typography>
        </View>
      ) : (
        files.map((file) => (
          <View
            key={file.id}
            className="flex-row items-center justify-between bg-white border border-border rounded-lg p-3 shadow-sm">
            <View>
              <Typography variant="body" className="text-sm font-semibold text-gray-900">
                {file.name}
              </Typography>
              <Typography variant="caption" color="muted">
                {file.type} - Uploaded {formatTimestampShort(file.uploadedAt)}
              </Typography>
            </View>
            <View className="flex-row items-center gap-3">
              <Typography variant="caption" color="muted">
                {iconForMime(file.type, file.name)} {file.uploadedBy ?? 'Unknown uploader'} · {formatBytes(file.size)}
              </Typography>
            <Button
              variant="outline"
              size="sm"
              disabled={!orgId || !supabaseReady || openingId === file.id}
              loading={openingId === file.id}
                onPress={async () => {
                  if (!orgId || !supabaseReady) return;
                  setOpeningId(file.id);
                  setStatus(null);
                  try {
                    const doc = documents?.find((d) => d.id === file.id);
                    if (!doc?.storage_path) throw new Error('Document path missing');
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
                variant="outline"
                size="sm"
                disabled={!orgId || !supabaseReady || openingId === file.id}
                loading={openingId === file.id}
                onPress={async () => {
                  if (!orgId || !supabaseReady) return;
                  setOpeningId(file.id);
                  setStatus(null);
                  try {
                    const doc = documents?.find((d) => d.id === file.id);
                    if (!doc?.storage_path) throw new Error('Document path missing');
                    const url = await createSignedReadUrl('documents', doc.storage_path);
                    if (!url) throw new Error('Signed URL unavailable');
                    await Linking.openURL(url);
                  } catch (e: any) {
                    setStatus(e?.message ?? 'Download failed');
                  } finally {
                    setOpeningId(null);
                  }
                }}>
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!orgId || deletingId === file.id}
                loading={deletingId === file.id}
                onPress={async () => {
                  if (!orgId) return;
                  if (confirmingId !== file.id) {
                    setConfirmingId(file.id);
                    setStatus('Tap delete again to confirm.');
                    return;
                  }
                  setDeletingId(file.id);
                  setStatus(null);
                  try {
                    await deleteDocumentRecord(orgId, file.id);
                    await queryClient.invalidateQueries({ queryKey: ['documents', orgId, 'dog', dogId] });
                    await queryClient.invalidateQueries({ queryKey: ['dog-timeline', orgId, dogId] });
                    setConfirmingId(null);
                  } catch (e: any) {
                    setStatus(e?.message ?? 'Delete failed');
                  } finally {
                    setDeletingId(null);
                  }
                }}>
                {confirmingId === file.id ? 'Confirm delete' : 'Delete'}
              </Button>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const FinancialTab = ({ spent, limit }: { spent: number; limit?: number | null }) => {
  const remaining = typeof limit === 'number' ? Math.max(limit - spent, 0) : null;
  return (
    <View className="gap-4">
      <Card title="Budget Overview">
        <View className="gap-2">
          <SummaryRow label="Budget limit" value={limit != null ? `$${limit}` : 'Not set'} />
          <SummaryRow label="Spent" value={`$${spent}`} />
          <SummaryRow label="Remaining" value={remaining != null ? `$${remaining}` : 'Not set'} />
        </View>
      </Card>
      <Card title="Expenses (mock)">
        <Typography variant="body" color="muted">
          Expenses tracking will connect to Supabase in Phase 2. Add edge-function-backed inserts with audit logging.
        </Typography>
      </Card>
    </View>
  );
};

const PeopleHousingTab = ({ dog }: { dog: DogProfileView }) => (
  <View className="gap-4">
    <Card title="Assignments">
      <SummaryRow label="Responsible" value={dog.responsiblePerson || 'Unassigned'} />
      <SummaryRow label="Foster" value={dog.fosterName || 'No foster'} />
      <SummaryRow label="Location" value={dog.location || 'Unknown'} />
    </Card>
    <Card title="Housing Notes">
      <Typography variant="body" color="muted">
        Housing and people workflows will use memberships + RLS in Phase 2. Current data is mock-only.
      </Typography>
    </Card>
  </View>
);

const ChatTab = () => (
  <View className="gap-4">
    <Card title="Chat (mock)">
      <Typography variant="body" color="muted">
        Real-time chat is out of scope for Phase 1. In Phase 2/3, consider Supabase Realtime channels scoped by
        org_id + dog_id with RLS.
      </Typography>
    </Card>
  </View>
);

const CheckRow = ({ label, checked }: { label: string; checked: boolean }) => (
  <View className="flex-row items-center gap-3">
    <View
      className={`w-5 h-5 border rounded items-center justify-center ${
        checked ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
      }`}>
      {checked ? <Check size={12} color={UI_COLORS.white} /> : null}
    </View>
    <Typography variant="body" className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
      {label}
    </Typography>
  </View>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-2.5">
    <Typography variant="body" color="muted">{label}</Typography>
    <Typography variant="body" className="text-sm font-medium text-gray-900">{value}</Typography>
  </View>
);

const InputRow = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
}) => (
  <Input label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} />
);

const NotesList = ({ notes, onAddNote }: { notes: Note[]; onAddNote: () => void }) => (
  <View className="gap-3">
    <Button variant="outline" size="sm" onPress={onAddNote} className="self-start">
      Add note
    </Button>
    {notes.length === 0 ? (
      <Typography variant="body" color="muted">No notes yet.</Typography>
    ) : (
      notes.map((note) => (
        <View key={note.id} className="border border-border rounded-md p-3 bg-surface">
          <View className="flex-row justify-between items-center mb-1">
            <Typography variant="body" className="text-sm font-semibold text-gray-900">
              {note.author}
            </Typography>
            <Typography variant="caption" color="muted">{formatTimestampShort(note.createdAt)}</Typography>
          </View>
          <Typography variant="body" className="text-sm text-gray-700">{note.body}</Typography>
        </View>
      ))
    )}
  </View>
);

const PlaceholderTab = ({ label }: { label: string }) => (
  <View className="p-10 border-2 border-dashed border-border rounded-lg items-center justify-center">
    <Typography variant="body" color="muted">Placeholder for {label}</Typography>
  </View>
);

// Dates are centralized in lib/formatters/dates.ts





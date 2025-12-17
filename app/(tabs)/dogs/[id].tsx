import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Search,
  Truck,
  User,
  Users,
} from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Dog } from '@/schemas/dog';
import { TABS } from '@/stores/uiStore';
import { useDog } from '@/hooks/useDog';
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
};

const toDogProfileView = (dog: Dog): DogProfileView => {
  const attributes = dog.extra_fields.attributes ?? {};

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
  };
};

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(id) ? id[0] : id;

  const { activeOrgId, ready, bootstrap, memberships, switchOrg } = useSessionStore();
  const [activeViewTab, setActiveViewTab] = useState<(typeof TABS)[number]>('Overview');

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  const { data, isLoading } = useDog(activeOrgId ?? undefined, dogId ?? undefined);
  const dog = data ? toDogProfileView(data) : null;

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading dog profile...</Text>
      </View>
    );
  }

  if (!activeOrgId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-base font-semibold text-gray-900">No active organization</Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Select an organization to view dog details. If you do not see any, create or join an org.
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoading || !dog) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading dog profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 bg-white">
        <TopBar
          dog={dog}
          activeOrgId={activeOrgId}
          memberships={memberships}
          switchOrg={switchOrg}
          ready={ready}
        />

        <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="w-full max-w-5xl self-center px-4 md:px-8">
            <DogHeader dog={dog} />

            <KeyMetrics dog={dog} />

            <TabsBar activeTab={activeViewTab} setActiveTab={setActiveViewTab} />

            {renderTab(activeViewTab, dog)}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const renderTab = (tab: (typeof TABS)[number], dog: DogProfileView) => {
  switch (tab) {
    case 'Overview':
      return <OverviewTab dog={dog} />;
    default:
      return <PlaceholderTab label={tab} />;
  }
};

const TopBar = ({
  dog,
  activeOrgId,
  memberships,
  switchOrg,
  ready,
}: {
  dog: DogProfileView;
  activeOrgId: string | null;
  memberships: { org_id: string; org_name: string }[];
  switchOrg: (orgId: string) => void;
  ready: boolean;
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
        <View className="flex-row items-center bg-surface border border-border rounded-md px-3 h-10 w-56">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-sm text-gray-900"
          />
        </View>
        <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center border border-gray-300">
          <Text className="text-[11px] font-bold text-gray-600">AD</Text>
        </View>
      </View>
    </View>

    <OrgSelectorInline
      activeOrgId={activeOrgId}
      memberships={memberships}
      switchOrg={switchOrg}
      ready={ready}
    />
  </View>
);

const OrgSelectorInline = ({
  activeOrgId,
  memberships,
  switchOrg,
  ready,
}: {
  activeOrgId: string | null;
  memberships: { org_id: string; org_name: string }[];
  switchOrg: (orgId: string) => void;
  ready: boolean;
}) => {
  if (!ready) return null;
  if (!memberships.length) return null;
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="text-xs text-gray-500">Active org:</Text>
      {memberships.map((m) => {
        const isActive = m.org_id === activeOrgId;
        return (
          <Pressable
            key={m.org_id}
            onPress={() => switchOrg(m.org_id)}
            className={`px-2 py-1.5 rounded-full border ${
              isActive ? 'bg-gray-900 border-gray-900' : 'bg-surface border-border'
            }`}>
            <Text
              className={`text-[11px] ${
                isActive ? 'text-white font-semibold' : 'text-gray-800'
              }`}>
              {m.org_name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const DogHeader = ({ dog }: { dog: DogProfileView }) => (
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
      <ActionButton label="Add note" />
      <ActionButton label="Upload document" />
      <Pressable className="w-10 h-10 items-center justify-center border border-border rounded-md bg-white">
        <MoreHorizontal size={20} color="#6B7280" />
      </Pressable>
    </View>
  </View>
);

const ActionButton = ({ label }: { label: string }) => (
  <Pressable className="bg-white border border-border py-2 px-4 rounded-md shadow-sm">
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

const OverviewTab = ({ dog }: { dog: DogProfileView }) => {
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

const PlaceholderTab = ({ label }: { label: string }) => (
  <View className="p-10 border-2 border-dashed border-border rounded-lg items-center justify-center">
    <Text className="text-gray-400">Placeholder for {label}</Text>
  </View>
);

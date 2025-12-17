import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Github,
  Grid,
  Home,
  MapPin,
  MoreHorizontal,
  Search,
  Settings,
  Truck,
  User,
  Users,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { dogSchema, Dog } from '@/schemas/dog';
import { TABS, useUIStore } from '@/stores/uiStore';

const mockDog: Dog = {
  id: '1',
  internalId: 'DOG-1234',
  name: 'Buddy',
  status: 'In Foster',
  photoUrl:
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
  location: 'Vet: Clinic XYZ',
  responsiblePerson: 'Maria Garcia',
  fosterName: 'Sarah Johnson',
  budgetSpent: 1500,
  lastUpdate: 'Today, 10:45 AM',
  attributes: {
    age: '2 years',
    sex: 'Male',
    size: 'Medium',
    breed: 'Labrador Mix',
    intakeDate: 'Oct 15, 2023',
  },
  alerts: [
    { type: 'error', message: 'No foster assigned' },
    { type: 'warning', message: 'Vaccination overdue' },
  ],
};

const fetchDog = async (dogId: string): Promise<Dog> => {
  // Placeholder for Supabase fetch; keeps schema validation in place.
  return dogSchema.parse({ ...mockDog, id: dogId });
};

const useDogQuery = (dogId: string) =>
  useQuery({
    queryKey: ['dog', dogId],
    queryFn: () => fetchDog(dogId),
    staleTime: 1000 * 60 * 5,
  });

export default function HomeScreen() {
  const { data: dog, isLoading } = useDogQuery('1');
  const { activeTab, setActiveTab } = useUIStore();
  const { width } = useWindowDimensions();
  const showSidebar = width >= 1024;

  if (isLoading || !dog) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Loading dog profile…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 flex-row">
        {showSidebar ? <Sidebar /> : null}

        <View className="flex-1 bg-white">
          <TopBar dog={dog} />

          <ScrollView
            className="flex-1 bg-surface"
            contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="w-full max-w-5xl self-center px-4 md:px-8">
              <DogHeader dog={dog} />

              <KeyMetrics dog={dog} />

              <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

              {activeTab === 'Overview' ? (
                <OverviewTab dog={dog} />
              ) : (
                <PlaceholderTab label={activeTab} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const Sidebar = () => (
  <View className="w-64 bg-surface border-r border-border p-6 gap-6">
    <View className="flex-row items-center gap-3">
      <View className="w-7 h-7 bg-gray-900 rounded-md items-center justify-center">
        <Text className="text-white font-bold text-xs">R</Text>
      </View>
      <Text className="text-base font-bold text-gray-900 tracking-tight">RESCUEOPS</Text>
    </View>

    <View className="gap-2">
      <SidebarItem icon={Grid} label="Dashboard" />
      <SidebarItem icon={Github} label="Dogs" active />
      <SidebarItem icon={Truck} label="Transports" />
      <SidebarItem icon={Users} label="People & Homes" />
      <SidebarItem icon={DollarSign} label="Finance" />
      <SidebarItem icon={Settings} label="Settings" />
    </View>

    <View className="mt-auto pt-6 border-t border-border flex-row items-center gap-3">
      <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
        <Text className="text-[10px] font-bold text-gray-500">SF</Text>
      </View>
      <View>
        <Text className="text-sm font-semibold text-gray-900">Stray Found</Text>
        <Text className="text-xs text-gray-500">Admin</Text>
      </View>
    </View>
  </View>
);

const SidebarItem = ({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Grid;
  label: string;
  active?: boolean;
}) => (
  <Pressable
    className={`flex-row items-center gap-3 py-2 px-3 rounded-md w-full ${
      active ? 'bg-gray-200' : 'bg-transparent'
    }`}>
    <Icon size={18} color={active ? '#111827' : '#6B7280'} />
    <Text className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
      {label}
    </Text>
  </Pressable>
);

const TopBar = ({ dog }: { dog: Dog }) => (
  <View className="h-16 bg-white border-b border-border flex-row items-center justify-between px-4 md:px-8">
    <Text className="text-sm font-medium text-gray-500">
      Dog Detail:{' '}
      <Text className="text-gray-900 font-semibold">
        {dog.name.toUpperCase()} ({dog.internalId})
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
);

const DogHeader = ({ dog }: { dog: Dog }) => (
  <View className="flex-col md:flex-row justify-between gap-6 mb-8">
    <View className="flex-row gap-4">
      <Image
        source={{ uri: dog.photoUrl }}
        className="w-24 h-24 rounded-lg bg-gray-200 border border-border"
      />
      <View className="justify-center">
        <Text className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{dog.name}</Text>
        <Text className="text-sm text-gray-500 font-mono mb-3">Internal ID: {dog.internalId}</Text>
        <Pressable className="flex-row items-center gap-2 bg-white border border-border py-1.5 px-3 rounded-full self-start">
          <Home size={14} color="#111827" />
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

const KeyMetrics = ({ dog }: { dog: Dog }) => (
  <View className="flex-row flex-wrap gap-4 mb-8">
    <KeyMetric icon={MapPin} label="LOCATION" value={dog.location} />
    <KeyMetric icon={User} label="RESPONSIBLE" value={dog.responsiblePerson} />
    <KeyMetric icon={Home} label="FOSTER" value={dog.fosterName || '-'} />
    <KeyMetric icon={DollarSign} label="SPENT" value={`$${dog.budgetSpent}`} />
    <KeyMetric icon={Clock} label="UPDATED" value={dog.lastUpdate} />
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

const OverviewTab = ({ dog }: { dog: Dog }) => (
  <View className="flex-col lg:flex-row gap-6">
    <View className="flex-[2] gap-6">
      <Card title="Character & Temperament">
        <Text className="text-sm leading-relaxed text-gray-600">
          Energetic, friendly with people, gets along with other dogs. Needs some training on leash
          walking but very food motivated. Does not like cats.
        </Text>
      </Card>

      <Card title="Adoption Description">
        <Text className="text-sm leading-relaxed text-gray-600">
          Buddy is a playful dog who loves outdoor activities. He would be a great fit for an active
          family. He is fully vaccinated and neutered. He loves playing fetch and is very affectionate
          once he gets to know you.
        </Text>
      </Card>

      <Card title="Current Needs">
        <View className="gap-3">
          <CheckRow label="Needs foster" checked={false} />
          <CheckRow label="Needs transport" checked />
          <CheckRow label="Needs medical care" checked={false} />
          <CheckRow label="Needs documents" checked={false} />
        </View>
      </Card>
    </View>

    <View className="flex-1 gap-6">
      <Card title="Quick Summary">
        <View className="flex-col divide-y divide-gray-50">
          <SummaryRow label="Age" value={dog.attributes.age} />
          <SummaryRow label="Sex" value={dog.attributes.sex} />
          <SummaryRow label="Size" value={dog.attributes.size} />
          <SummaryRow label="Breed" value={dog.attributes.breed} />
          <SummaryRow label="Intake" value={dog.attributes.intakeDate} />
        </View>
      </Card>

      <Card title="Alerts">
        <View className="gap-2">
          {dog.alerts.map((alert, idx) => (
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
          ))}
        </View>
      </Card>
    </View>
  </View>
);

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

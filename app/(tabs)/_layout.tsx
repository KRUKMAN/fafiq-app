import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, usePathname, useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Dog,
  Grid,
  Settings,
  Truck,
  Users,
} from 'lucide-react-native';

import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Grid;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Grid },
  { href: '/dogs', label: 'Dogs', icon: Dog },
  { href: '/transports', label: 'Transports', icon: Truck },
  { href: '/people', label: 'People & Homes', icon: Users },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { ready, isAuthenticated, bootstrap } = useSessionStore();

  useEffect(() => {
    if (!ready) {
      bootstrap();
    }
  }, [ready, bootstrap]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600">Preparing your session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 flex-row">
        <Sidebar
          pathname={pathname}
          onNavigate={(href) => router.push(href as never)}
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        <View className="flex-1 bg-white">
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}

const Sidebar = ({
  pathname,
  onNavigate,
  isOpen,
  toggleSidebar,
}: {
  pathname: string;
  onNavigate: (href: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}) => {
  return (
    <View
      className={`border-r border-border bg-[#FAFAFA] py-6 ${
        isOpen ? 'w-[260px]' : 'w-16'
      }`}>
      <View className="flex-row items-center px-4 mb-8">
        <View className="w-8 h-8 bg-gray-900 rounded-md items-center justify-center">
          <Text className="text-white font-bold text-xs">R</Text>
        </View>
        {isOpen ? (
          <Text className="ml-3 text-base font-bold text-gray-900 tracking-tight">
            RESCUEOPS
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel="Toggle sidebar"
          onPress={toggleSidebar}
          className="ml-auto p-2 rounded-md border border-border bg-white">
          {isOpen ? <ChevronLeft size={16} color="#4B5563" /> : <ChevronRight size={16} color="#4B5563" />}
        </Pressable>
      </View>

      <View className="gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' || pathname === '' : pathname.startsWith(item.href);

          return (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={isActive}
              isOpen={isOpen}
              onPress={() => {
                if (pathname !== item.href) {
                  onNavigate(item.href);
                }
              }}
            />
          );
        })}
      </View>

      <View className="mt-auto flex-row items-center gap-3 px-4 pt-6 border-t border-border">
        <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center">
          <Text className="text-[11px] font-bold text-gray-600">SF</Text>
        </View>
        {isOpen ? (
          <View>
            <Text className="text-sm font-semibold text-gray-900">Stray Found</Text>
            <Text className="text-xs text-gray-500">Admin</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const SidebarItem = ({
  item,
  isActive,
  isOpen,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  isOpen: boolean;
  onPress: () => void;
}) => {
  const Icon = item.icon;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-2 px-3 rounded-md w-full ${
        isActive ? 'bg-gray-200' : 'hover:bg-gray-100'
      }`}>
      <Icon size={18} color={isActive ? '#111827' : '#6B7280'} />
      {isOpen ? (
        <Text className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
};

import { Slot, usePathname, useRouter } from 'expo-router';
import {
  Dog,
  DollarSign,
  Grid,
  Settings,
  Truck,
  Users,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UI_COLORS } from '@/constants/uiColors';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';

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
  const { ready, isAuthenticated, activeOrgId, memberships, currentUser, bootstrap, signOut } = useSessionStore();

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

  if (ready && isAuthenticated && !activeOrgId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <View className="items-center gap-3">
          <Text className="text-base font-semibold text-foreground">No organization selected</Text>
          <Text className="text-sm text-muted text-center">
            Your account has no active memberships. Ask an admin to add you, or sign out and switch accounts.
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/settings')}
              className="px-4 py-2 rounded-lg border border-border bg-card">
              <Text className="text-sm font-semibold text-foreground">Go to Settings</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={signOut}
              className="px-4 py-2 rounded-lg bg-primary">
              <Text className="text-sm font-semibold text-white">Sign out</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-muted">Preparing your session...</Text>
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
          currentUser={currentUser}
          activeOrgId={activeOrgId}
          memberships={memberships}
          onSignOut={signOut}
        />

        <View className="flex-1 bg-background">
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
  onSignOut,
  currentUser,
  activeOrgId,
  memberships,
}: {
  pathname: string;
  onNavigate: (href: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  currentUser: { id: string; name: string; email: string } | null;
  activeOrgId: string | null;
  memberships: { id: string; org_id: string; org_name: string; roles: string[]; active: boolean }[];
  onSignOut: () => void;
}) => {
  const activeMembership =
    memberships.find((m) => m.org_id === activeOrgId && m.active) ?? memberships.find((m) => m.active) ?? null;
  const displayName = currentUser?.name || currentUser?.email || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  const roleLabel = activeMembership?.roles?.join(', ') || 'Member';

  return (
    <View
      className={`border-r border-border bg-surface py-6 ${isOpen ? 'w-64' : 'w-16'}`}>
      <Pressable
        accessibilityLabel="Toggle sidebar"
        onPress={toggleSidebar}
        className="flex-row items-center px-4 mb-8">
        <View className="w-8 h-8 bg-primary rounded-md items-center justify-center">
          <Text className="text-white font-bold text-xs">R</Text>
        </View>
        {isOpen ? (
          <Text className="ml-3 text-base font-bold text-foreground tracking-tight">
            RESCUEOPS
          </Text>
        ) : null}
      </Pressable>

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
        <View className="w-9 h-9 rounded-full bg-card items-center justify-center border border-border">
          <Text className="text-xs font-bold text-muted">{initials}</Text>
        </View>
        {isOpen ? (
          <View>
            <Text className="text-sm font-semibold text-foreground">{displayName}</Text>
            <Text className="text-xs text-muted">{roleLabel}</Text>
          </View>
        ) : null}
        {isOpen ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSignOut}
            className="ml-auto px-2 py-1 rounded-md border border-border bg-card">
            <Text className="text-xs font-semibold text-foreground">Sign out</Text>
          </Pressable>
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
        isActive ? 'bg-card' : 'hover:bg-card'
      }`}>
      <Icon size={18} color={isActive ? UI_COLORS.foreground : UI_COLORS.muted} />
      {isOpen ? (
        <Text className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted'}`}>
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
};

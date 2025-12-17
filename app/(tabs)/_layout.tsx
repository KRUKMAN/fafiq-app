import { Tabs } from 'expo-router';
import React from 'react';
import { Dog, Home } from 'lucide-react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dogs"
        options={{
          title: 'Dogs',
          tabBarIcon: ({ color }) => <Dog size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

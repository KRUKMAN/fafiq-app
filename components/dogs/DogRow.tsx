import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MapPin, MoreHorizontal, User } from 'lucide-react-native';

import { AlertIcons } from './AlertIcons';
import { StatusBadge } from './StatusBadge';

export type DogListItem = {
  id: string;
  name: string;
  internalId: string;
  status: string;
  breed?: string;
  sex?: string;
  age?: string;
  photoUrl?: string;
  location?: string;
  responsiblePerson?: string;
  daysInCare?: number | null;
  budgetSpent?: number | null;
  alerts?: { type: 'warning' | 'error'; message: string }[];
};

type DogRowProps = {
  item: DogListItem;
  onPress: () => void;
  onActionPress?: () => void;
};

const columnWidths = {
  details: 320,
  status: 150,
  location: 240,
  metrics: 180,
  alerts: 120,
  actions: 70,
};

export const DogRow = React.memo(({ item, onPress, onActionPress }: DogRowProps) => {
  const budget = item.budgetSpent ?? 0;
  const budgetPct = Math.min(Math.max((budget / 2000) * 100, 0), 100);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white">
      <View style={{ width: columnWidths.details }} className="flex-row items-center gap-3">
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            className="w-12 h-12 rounded-lg bg-gray-200 border border-border"
          />
        ) : (
          <View className="w-12 h-12 rounded-lg bg-gray-100 border border-border items-center justify-center">
            <Text className="text-xs text-gray-500">No photo</Text>
          </View>
        )}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-xs font-mono text-gray-400" numberOfLines={1}>
              {item.internalId || '-'}
            </Text>
          </View>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {[item.breed, item.sex, item.age].filter(Boolean).join(' • ') || 'No details'}
          </Text>
        </View>
      </View>

      <View style={{ width: columnWidths.status }}>
        <StatusBadge status={item.status} />
      </View>

      <View style={{ width: columnWidths.location }}>
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color="#9CA3AF" />
          <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
            {item.location || 'Unknown location'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 mt-1">
          <User size={12} color="#9CA3AF" />
          <Text className="text-xs text-gray-600" numberOfLines={1}>
            {item.responsiblePerson || 'Unassigned'}
          </Text>
        </View>
      </View>

      <View style={{ width: columnWidths.metrics }}>
        <Text className="text-sm font-semibold text-gray-900">
          {item.daysInCare != null ? `${item.daysInCare} days` : '—'}
        </Text>
        <View className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <View
            style={{ width: `${budgetPct}%` }}
            className={`h-full rounded-full ${budgetPct > 50 ? 'bg-orange-400' : 'bg-green-400'}`}
          />
        </View>
        <Text className="text-[10px] text-gray-400 mt-1">${budget} spent</Text>
      </View>

      <View style={{ width: columnWidths.alerts }}>
        <AlertIcons alerts={item.alerts} />
      </View>

      <View
        style={{ width: columnWidths.actions }}
        className="items-end justify-center">
        <Pressable
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onActionPress?.();
          }}
          className="p-2 rounded-md hover:bg-gray-100">
          <MoreHorizontal size={18} color="#6B7280" />
        </Pressable>
      </View>
    </Pressable>
  );
});

DogRow.displayName = 'DogRow';

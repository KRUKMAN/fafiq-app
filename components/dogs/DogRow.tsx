import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MapPin, MoreHorizontal, User } from 'lucide-react-native';

import { AlertIcons } from './AlertIcons';
import { StatusBadge } from './StatusBadge';
import { DOG_TABLE_COLUMNS } from './TableConfig';
import { formatLastUpdate } from '@/lib/formatters';

export type DogListItem = {
  id: string;
  name: string;
  internalId: string;
  stage: string;
  breed?: string;
  sex?: string;
  age?: string;
  photoUrl?: string;
  location?: string;
  responsiblePerson?: string;
  budgetSpent?: number | null;
  alerts?: { type: 'warning' | 'error'; message: string }[];
  lastUpdate?: string;
};

type DogRowProps = {
  item: DogListItem;
  onPress: () => void;
  onActionPress?: () => void;
};

const COL_BY_KEY = DOG_TABLE_COLUMNS.reduce<Record<string, (typeof DOG_TABLE_COLUMNS)[number]>>(
  (acc, col) => {
    acc[col.key] = col;
    return acc;
  },
  {}
);

export const DogRow = React.memo(({ item, onPress, onActionPress }: DogRowProps) => {
  const budget = item.budgetSpent ?? 0;
  const budgetPct = Math.min(Math.max((budget / 2000) * 100, 0), 100);
  const lastUpdate = formatLastUpdate(item.lastUpdate);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minWidth: '100%' }}
      className="flex-row items-center bg-white hover:bg-gray-50">
      <View
        style={{
          flex: COL_BY_KEY.details.flex,
          minWidth: COL_BY_KEY.details.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <View className="flex-row items-center gap-4">
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
      </View>

      <View
        style={{
          flex: COL_BY_KEY.stage.flex,
          minWidth: COL_BY_KEY.stage.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <StatusBadge status={item.stage} />
      </View>

      <View
        style={{
          flex: COL_BY_KEY.location.flex,
          minWidth: COL_BY_KEY.location.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color="#9CA3AF" />
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
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

      <View
        style={{
          flex: COL_BY_KEY.metrics.flex,
          minWidth: COL_BY_KEY.metrics.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <Text className="text-sm font-semibold text-gray-900">
          {lastUpdate}
        </Text>
        <View className="w-28 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <View
            style={{ width: `${budgetPct}%` }}
            className={`h-full rounded-full ${budgetPct > 50 ? 'bg-orange-400' : 'bg-green-400'}`}
          />
        </View>
        <Text className="text-[10px] text-gray-400 mt-1">${budget} spent</Text>
      </View>

      <View
        style={{
          flex: COL_BY_KEY.alerts.flex,
          minWidth: COL_BY_KEY.alerts.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <AlertIcons alerts={item.alerts} />
      </View>

      <View
        style={{
          flex: COL_BY_KEY.actions.flex,
          minWidth: COL_BY_KEY.actions.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4 items-end justify-center">
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

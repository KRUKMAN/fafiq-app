import { MapPin, User } from 'lucide-react-native';
import React from 'react';
import { Image, Platform, Pressable, View } from 'react-native';

import { RowAction, RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { Typography } from '@/components/ui/Typography';
import { formatLastUpdate } from '@/lib/formatters';
import { AlertIcons } from './AlertIcons';
import { StatusBadge } from './StatusBadge';
import { DOG_TABLE_COLUMNS } from './TableConfig';

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
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
};

const COL_BY_KEY = DOG_TABLE_COLUMNS.reduce<Record<string, (typeof DOG_TABLE_COLUMNS)[number]>>(
  (acc, col) => {
    acc[col.key] = col;
    return acc;
  },
  {}
);

export const DogRow = React.memo(({ item, onPress, onEdit, onDelete, onViewHistory }: DogRowProps) => {
  const budget = item.budgetSpent ?? 0;
  const budgetPct = Math.min(Math.max((budget / 2000) * 100, 0), 100);
  const lastUpdate = formatLastUpdate(item.lastUpdate);

  const actions: RowAction[] = [];
  if (onEdit) {
    actions.push({ key: 'edit', label: 'Edit', icon: 'edit', onPress: onEdit });
  }
  if (onViewHistory) {
    actions.push({ key: 'history', label: 'View History', icon: 'history', onPress: onViewHistory });
  }
  if (onDelete) {
    actions.push({ key: 'delete', label: 'Delete', icon: 'delete', destructive: true, onPress: onDelete });
  }

  const content = (
    <>
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
              <Typography variant="caption" color="muted">No photo</Typography>
            </View>
          )}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Typography variant="body" className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {item.name}
              </Typography>
              <Typography variant="caption" className="text-xs font-mono text-gray-400" numberOfLines={1}>
                {item.internalId || '-'}
              </Typography>
            </View>
            <Typography variant="caption" color="muted" numberOfLines={1}>
              {[item.breed, item.sex, item.age].filter(Boolean).join(' • ') || 'No details'}
            </Typography>
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
          <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {item.location || 'Unknown location'}
          </Typography>
        </View>
        <View className="flex-row items-center gap-1.5 mt-1">
          <User size={12} color="#9CA3AF" />
          <Typography variant="caption" color="muted" numberOfLines={1}>
            {item.responsiblePerson || 'Unassigned'}
          </Typography>
        </View>
      </View>

      <View
        style={{
          flex: COL_BY_KEY.metrics.flex,
          minWidth: COL_BY_KEY.metrics.minWidth,
          paddingHorizontal: 12,
        }}
        className="py-4">
        <Typography variant="body" className="text-sm font-semibold text-gray-900">
          {lastUpdate}
        </Typography>
        <View className="w-28 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <View
            style={{ width: `${budgetPct}%` }}
            className={`h-full rounded-full ${budgetPct > 50 ? 'bg-orange-400' : 'bg-green-400'}`}
          />
        </View>
        <Typography variant="caption" className="text-[10px] text-gray-400 mt-1">
          ${budget} spent
        </Typography>
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
        <RowActionsMenu actions={actions} />
      </View>
    </>
  );

  // On web, nested Pressables can render as nested <button>s (<button><button>...) which is invalid HTML and breaks hydration.
  // Render the row container as a non-button element on web, while keeping proper button semantics on native.
  if (Platform.OS === 'web') {
    return (
      <View
        role="button"
        tabIndex={0}
        // @ts-expect-error web-only (react-native-web) event prop
        onClick={() => onPress()}
        onKeyDown={(e: any) => {
          if (e?.key === 'Enter' || e?.key === ' ') {
            e.preventDefault?.();
            onPress();
          }
        }}
        style={{ minWidth: '100%' }}
        className="flex-row items-center bg-white hover:bg-gray-50">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minWidth: '100%' }}
      className="flex-row items-center bg-white hover:bg-gray-50">
      {content}
    </Pressable>
  );
});

DogRow.displayName = 'DogRow';

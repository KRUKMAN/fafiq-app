import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { TableCell } from '@/components/table/TableCell';
import { RowAction, RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { Typography } from '@/components/ui/Typography';

export type TransportRowItem = {
  id: string;
  status: string;
  from: string;
  to: string;
  window: string;
  assigned: string;
};

export type TransporterRowItem = {
  id: string;
  name: string;
  email: string;
  userId: string;
  roles: string;
  status: string;
};

export function TransportRow({
  item,
  onPress,
  isTransporter,
  onEdit,
  onDelete,
  onViewHistory,
}: {
  item: TransportRowItem | TransporterRowItem;
  onPress: () => void;
  isTransporter: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
}) {
  const actions: RowAction[] = [];
  if (!isTransporter) {
    if (onEdit) actions.push({ key: 'edit', label: 'Edit', icon: 'edit', onPress: onEdit });
    if (onViewHistory) actions.push({ key: 'history', label: 'View History', icon: 'history', onPress: onViewHistory });
    if (onDelete) actions.push({ key: 'delete', label: 'Delete', icon: 'delete', destructive: true, onPress: onDelete });
  }

  if (isTransporter) {
    const t = item as TransporterRowItem;
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center" style={{ width: '100%' }}>
        <TableCell flex={1.4} minWidth={200}>
          <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {t.name}
          </Typography>
        </TableCell>
        <TableCell flex={1.4} minWidth={200}>
          <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
            {t.email}
          </Typography>
        </TableCell>
        <TableCell flex={1.2} minWidth={200}>
          <Typography variant="caption" className="text-[11px] text-gray-600" numberOfLines={1}>
            {t.userId}
          </Typography>
        </TableCell>
        <TableCell flex={1} minWidth={150}>
          <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
            {t.roles}
          </Typography>
        </TableCell>
        <TableCell flex={0.8} minWidth={120}>
          <Typography variant="bodySmall" className="text-xs font-semibold text-gray-800" numberOfLines={1}>
            {t.status}
          </Typography>
        </TableCell>
      </Pressable>
    );
  }

  const tr = item as TransportRowItem;

  const content = (
    <>
      <TableCell flex={1.2} minWidth={160}>
        <Typography variant="body" className="text-sm font-semibold text-gray-900" numberOfLines={1}>
          {tr.id}
        </Typography>
      </TableCell>
      <TableCell flex={1} minWidth={120}>
        <View className="px-2 py-1 rounded-full bg-primary">
          <Typography variant="bodySmall" className="text-xs text-white" numberOfLines={1}>
            {tr.status}
          </Typography>
        </View>
      </TableCell>
      <TableCell flex={1.2} minWidth={160}>
        <Typography variant="body" className="text-sm text-gray-800" numberOfLines={1}>
          {tr.from}
        </Typography>
      </TableCell>
      <TableCell flex={1.2} minWidth={160}>
        <Typography variant="body" className="text-sm text-gray-800" numberOfLines={1}>
          {tr.to}
        </Typography>
      </TableCell>
      <TableCell flex={1.4} minWidth={180}>
        <Typography variant="caption" color="muted" numberOfLines={1}>
          {tr.window}
        </Typography>
      </TableCell>
      <TableCell flex={1} minWidth={140}>
        <Typography variant="bodySmall" className="text-xs text-gray-700" numberOfLines={1}>
          {tr.assigned}
        </Typography>
      </TableCell>
      <TableCell flex={0.6} minWidth={60} align="right">
        <RowActionsMenu actions={actions} />
      </TableCell>
    </>
  );

  // RN Web: avoid nested <button> from nested Pressables
  if (Platform.OS === 'web') {
    return (
      <View
        role="button"
        tabIndex={0}
        // @ts-expect-error web-only event prop
        onClick={() => onPress()}
        onKeyDown={(e: any) => {
          if (e?.key === 'Enter' || e?.key === ' ') {
            e.preventDefault?.();
            onPress();
          }
        }}
        className="flex-row items-center"
        style={{ width: '100%' }}>
        {content}
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center" style={{ width: '100%' }}>
      {content}
    </Pressable>
  );
}



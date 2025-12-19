import { Eye, History, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export type RowAction = {
  key: string;
  label: string;
  icon?: 'edit' | 'delete' | 'view' | 'history' | 'restore';
  destructive?: boolean;
  onPress: () => void;
};

type RowActionsMenuProps = {
  actions: RowAction[];
};

const ICON_MAP = {
  edit: Pencil,
  delete: Trash2,
  view: Eye,
  history: History,
  restore: RotateCcw,
};

export const RowActionsMenu = ({ actions }: RowActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  const handlePress = (e: any) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const handleActionPress = (action: RowAction) => {
    setOpen(false);
    action.onPress();
  };

  // On web, use View with onClick (no role="button") to avoid nested button issue when inside a button-like element
  // The View will render as a <div>, not a <button>, preventing nested button errors
  const triggerButton = Platform.OS === 'web' ? (
    <View
      tabIndex={0}
      // @ts-expect-error web-only (react-native-web) event prop
      onClick={(e: any) => {
        e?.stopPropagation?.();
        handlePress(e);
      }}
      onKeyDown={(e: any) => {
        if (e?.key === 'Enter' || e?.key === ' ') {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          handlePress(e);
        }
      }}
      className="p-2 rounded-md hover:bg-gray-100 cursor-pointer"
      aria-label="More actions">
      <MoreHorizontal size={18} color="#6B7280" />
    </View>
  ) : (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      className="p-2 rounded-md hover:bg-gray-100">
      <MoreHorizontal size={18} color="#6B7280" />
    </Pressable>
  );

  return (
    <View className="relative">
      {triggerButton}

      {open && (
        <>
          {/* Backdrop to close menu on click outside */}
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-40"
            style={{ position: 'absolute' as any, top: -1000, left: -1000, right: -1000, bottom: -1000 }}
          />
          <View className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-white shadow-lg z-50">
            {actions.map((action, index) => {
              const IconComponent = action.icon ? ICON_MAP[action.icon] : null;
              const isDestructive = action.destructive || action.icon === 'delete';
              return (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleActionPress(action);
                  }}
                  className={`flex-row items-center gap-2 px-3 py-2.5 ${
                    index === 0 ? 'rounded-t-lg' : ''
                  } ${index === actions.length - 1 ? 'rounded-b-lg' : ''} hover:bg-gray-50 active:bg-gray-100`}>
                  {IconComponent && (
                    <IconComponent size={14} color={isDestructive ? '#DC2626' : '#6B7280'} />
                  )}
                  <Text
                    className={`text-sm ${isDestructive ? 'text-red-600' : 'text-gray-700'}`}
                    numberOfLines={1}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};


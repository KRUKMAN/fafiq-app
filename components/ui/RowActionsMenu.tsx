import { Eye, History, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { UI_COLORS } from '@/constants/uiColors';

import { cn } from './cn';
import { Typography } from './Typography';

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
  const triggerRef = useRef<any>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  if (actions.length === 0) return null;

  const openMenu = (e: any) => {
    e?.stopPropagation?.();

    const node = triggerRef.current as any;
    if (node?.measureInWindow) {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
      return;
    }

    setAnchor(null);
    setOpen(true);
  };

  const handleActionPress = (action: RowAction) => {
    setOpen(false);
    action.onPress();
  };

  // On web, use View with onClick (no role="button") to avoid nested button issue when inside a button-like element
  // The View will render as a <div>, not a <button>, preventing nested button errors
  const triggerButton = Platform.OS === 'web' ? (
    <View
      ref={triggerRef}
      tabIndex={0}
      // @ts-expect-error web-only (react-native-web) event prop
      onClick={(e: any) => {
        e?.stopPropagation?.();
        openMenu(e);
      }}
      onKeyDown={(e: any) => {
        if (e?.key === 'Enter' || e?.key === ' ') {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          openMenu(e);
        }
      }}
      className="p-2 rounded-md hover:bg-surface cursor-pointer"
      aria-label="More actions">
      <MoreHorizontal size={18} color={UI_COLORS.muted} />
    </View>
  ) : (
    <Pressable
      ref={triggerRef as any}
      accessibilityRole="button"
      onPress={openMenu}
      className="p-2 rounded-md hover:bg-surface">
      <MoreHorizontal size={18} color={UI_COLORS.muted} />
    </Pressable>
  );

  const menuStyle =
    anchor && open
      ? {
          position: 'absolute' as const,
          top: anchor.y + anchor.height + 4,
          left: Math.max(8, anchor.x + anchor.width - 176),
        }
      : {
          position: 'absolute' as const,
          top: 64,
          right: 16,
        };

  return (
    <View className="relative">
      {triggerButton}

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            e?.stopPropagation?.();
            setOpen(false);
          }}
        />
        <View style={menuStyle} className="w-44 rounded-lg border border-border bg-card shadow-lg">
          {actions.map((action, index) => {
            const IconComponent = action.icon ? ICON_MAP[action.icon] : null;
            const isDestructive = action.destructive || action.icon === 'delete';
            return (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handleActionPress(action);
                }}
                className={cn(
                  'flex-row items-center gap-2 px-3 py-2',
                  index === 0 && 'rounded-t-lg',
                  index === actions.length - 1 && 'rounded-b-lg',
                  'hover:bg-surface active:bg-surface'
                )}>
                {IconComponent ? (
                  <IconComponent size={14} color={isDestructive ? UI_COLORS.destructive : UI_COLORS.muted} />
                ) : null}
                <Typography
                  variant="body"
                  className={cn('text-sm', isDestructive ? 'text-destructive' : 'text-foreground')}
                  numberOfLines={1}>
                  {action.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
};


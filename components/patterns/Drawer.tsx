import React from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/components/ui/cn';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  widthClassName?: string; // e.g. "max-w-5xl" or "max-w-md"
  overlayClassName?: string;
  children: React.ReactNode;
};

/**
 * Side drawer that works on native + web.
 * - Uses Pressable backdrop for outside click/tap close
 * - Avoids relying on web-only CSS like position: fixed classes
 */
export function Drawer({ open, onClose, widthClassName = 'max-w-5xl', overlayClassName, children }: DrawerProps) {
  if (!open) return null;

  return (
    <View className="absolute inset-0 flex-row z-50" style={{ pointerEvents: 'box-none' }}>
      <Pressable
        accessibilityRole="button"
        className={cn('flex-1 bg-black/30', overlayClassName)}
        onPress={onClose}
      />
      <View className={cn('ml-auto h-full w-full bg-white border-l border-border shadow-2xl', widthClassName)}>
        {children}
      </View>
    </View>
  );
}



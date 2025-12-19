import React from 'react';
import { Modal, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

import { UI_COLORS } from '@/constants/uiColors';
import { STRINGS } from '@/constants/strings';

import { Button } from './Button';
import { Typography } from './Typography';

export type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmLabel = STRINGS.common.confirm,
  cancelLabel = STRINGS.common.cancel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-md bg-card rounded-xl shadow-2xl overflow-hidden">
          <View className="p-6">
            <View className="flex-row items-start gap-4">
              {destructive && (
                <View className="w-10 h-10 rounded-full bg-surface items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} color={UI_COLORS.destructive} />
                </View>
              )}
              <View className="flex-1">
                <Typography variant="h3" className="text-lg font-semibold">
                  {title}
                </Typography>
                <Typography variant="body" color="muted" className="mt-2 leading-relaxed">
                  {message}
                </Typography>
              </View>
            </View>
          </View>
          <View className="flex-row gap-3 px-6 pb-6">
            <Button variant="outline" fullWidth onPress={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              fullWidth
              onPress={onConfirm}
              disabled={loading}
              loading={loading}>
              {loading ? STRINGS.common.pleaseWait : confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};


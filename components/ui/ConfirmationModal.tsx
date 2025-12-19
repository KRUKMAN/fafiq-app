import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <View className="p-6">
            <View className="flex-row items-start gap-4">
              {destructive && (
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} color="#DC2626" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">{title}</Text>
                <Text className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</Text>
              </View>
            </View>
          </View>
          <View className="flex-row gap-3 px-6 pb-6">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg border border-border bg-white ${loading ? 'opacity-50' : ''}`}>
              <Text className="text-center text-sm font-semibold text-gray-900">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg ${
                destructive
                  ? loading
                    ? 'bg-red-300'
                    : 'bg-red-600'
                  : loading
                    ? 'bg-gray-300'
                    : 'bg-gray-900'
              }`}>
              <Text className="text-center text-sm font-semibold text-white">
                {loading ? 'Please wait...' : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};


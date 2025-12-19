import { X } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { UI_COLORS } from '@/constants/uiColors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';

export function NoteModal({
  draft,
  onChangeDraft,
  onSave,
  onClose,
}: {
  draft: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <View className="absolute inset-0 bg-black/30 items-center justify-center px-4">
      <View className="w-full max-w-md bg-card rounded-lg border border-border shadow-2xl p-4 gap-3">
        <View className="flex-row justify-between items-center">
          <Typography variant="h3" className="text-base font-semibold">
            Add note
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onPress={onClose}
            leftIcon={<X size={18} color={UI_COLORS.muted} />}>
            Close
          </Button>
        </View>

        <Input
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Write a quick note..."
          multiline
          className="min-h-24"
        />

        <View className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onPress={onSave}>
            Save note
          </Button>
        </View>
      </View>
    </View>
  );
}



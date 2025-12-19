import React from 'react';
import { View } from 'react-native';
import { AlertCircle, AlertTriangle } from 'lucide-react-native';

import { UI_COLORS } from '@/constants/uiColors';

type Alert = { type: 'warning' | 'error'; message: string };

type AlertIconsProps = {
  alerts?: Alert[];
};

export const AlertIcons = React.memo(({ alerts }: AlertIconsProps) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View className="flex-row items-center gap-2">
      {alerts.slice(0, 3).map((alert, idx) => {
        const isError = alert.type === 'error';
        return (
          <View
            key={`${alert.type}-${idx}`}
            className="w-7 h-7 rounded-full border-2 border-white items-center justify-center bg-card">
            {isError ? (
              <AlertCircle size={14} color={UI_COLORS.destructive} />
            ) : (
              <AlertTriangle size={14} color={UI_COLORS.warning} />
            )}
          </View>
        );
      })}
    </View>
  );
});

AlertIcons.displayName = 'AlertIcons';

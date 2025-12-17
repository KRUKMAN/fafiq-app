import React from 'react';
import { View } from 'react-native';
import { AlertCircle, AlertTriangle } from 'lucide-react-native';

type Alert = { type: 'warning' | 'error'; message: string };

type AlertIconsProps = {
  alerts?: Alert[];
};

export const AlertIcons = React.memo(({ alerts }: AlertIconsProps) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View className="flex-row items-center">
      {alerts.slice(0, 3).map((alert, idx) => {
        const isError = alert.type === 'error';
        return (
          <View
            key={`${alert.type}-${idx}`}
            style={{ marginLeft: idx === 0 ? 0 : -6 }}
            className={`w-7 h-7 rounded-full border-2 border-white items-center justify-center ${
              isError ? 'bg-red-100' : 'bg-amber-100'
            }`}>
            {isError ? (
              <AlertCircle size={14} color="#b91c1c" />
            ) : (
              <AlertTriangle size={14} color="#b45309" />
            )}
          </View>
        );
      })}
    </View>
  );
});

AlertIcons.displayName = 'AlertIcons';

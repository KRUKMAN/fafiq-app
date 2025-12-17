import React from 'react';
import { Text, View } from 'react-native';

type Action = React.ReactElement;

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: Action[];
  accessory?: React.ReactElement | null;
};

export const PageHeader = ({ title, subtitle, actions, accessory }: PageHeaderProps) => {
  return (
    <View className="w-full px-6 py-4 border-b border-border bg-white">
      <View className="flex-row flex-wrap items-start gap-3">
        <View className="flex-1 min-w-[200px]">
          <Text className="text-2xl font-bold text-gray-900 tracking-tight">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap items-center gap-2 ml-auto">
          {accessory}
          {actions?.map((action, idx) => (
            <React.Fragment key={idx}>{action}</React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};

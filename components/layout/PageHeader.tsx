import React from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

type Action = React.ReactElement;

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: Action[];
  accessory?: React.ReactElement | null;
};

export const PageHeader = ({ title, subtitle, actions, accessory }: PageHeaderProps) => {
  return (
    <View className="w-full px-6 py-4 border-b border-border bg-card">
      <View className="flex-row flex-wrap items-start gap-3">
        <View className="flex-1 min-w-48">
          <Typography variant="h2" className="text-2xl">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body" color="muted" className="mt-1" numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </Typography>
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

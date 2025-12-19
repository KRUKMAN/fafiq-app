import React from 'react';
import { View } from 'react-native';

import { Typography } from './Typography';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <View className="items-center justify-center py-12 px-4">
    <Typography variant="body" className="text-base font-semibold text-gray-900">
      {title}
    </Typography>
    {description ? (
      <Typography variant="bodySmall" color="muted" className="mt-2 text-center">
        {description}
      </Typography>
    ) : null}
  </View>
);


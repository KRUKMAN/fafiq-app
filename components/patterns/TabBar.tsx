import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { cn } from '@/components/ui/cn';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT_STYLES } from '@/constants/layout';

export type TabBarProps<TTab extends string> = {
  tabs: readonly TTab[];
  active: TTab;
  onChange: (tab: TTab) => void;
  className?: string;
};

export function TabBar<TTab extends string>({ tabs, active, onChange, className }: TabBarProps<TTab>) {
  return (
    <View className={cn('border-b border-border', className)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={LAYOUT_STYLES.tabBarContent}>
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <Pressable key={tab} accessibilityRole="button" onPress={() => onChange(tab)}>
                <Typography
                  variant="body"
                  className={cn(
                    'pb-3 text-sm font-medium border-b-2',
                    isActive ? 'border-primary text-foreground' : 'border-transparent text-muted'
                  )}>
                  {tab}
                </Typography>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}



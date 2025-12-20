import dayjs, { Dayjs } from 'dayjs';
import React from 'react';
import { View } from 'react-native';

import { TabBar } from '@/components/patterns/TabBar';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';

const VIEW_TABS = [
  { value: 'day', label: STRINGS.calendar.viewDay },
  { value: 'week', label: STRINGS.calendar.viewWeek },
  { value: 'month', label: STRINGS.calendar.viewMonth },
] as const;

type CalendarMode = (typeof VIEW_TABS)[number]['value'];

type CalendarHeaderProps = {
  currentDate: Dayjs;
  mode: CalendarMode;
  onChangeMode: (mode: CalendarMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export const CalendarHeader = ({ currentDate, mode, onChangeMode, onPrev, onNext, onToday }: CalendarHeaderProps) => {
  const activeLabel = VIEW_TABS.find((tab) => tab.value === mode)?.label ?? STRINGS.calendar.viewWeek;
  const rangeLabel =
    mode === 'month'
      ? currentDate.format('MMMM YYYY')
      : mode === 'day'
        ? currentDate.format('MMM D, YYYY')
        : `${currentDate.startOf('week').format('MMM D')} - ${currentDate.endOf('week').format('MMM D, YYYY')}`;

  return (
    <View className="px-6 py-3 border-b border-border bg-background">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-1 min-w-48">
          <Typography variant="h3" className="text-xl">
            {rangeLabel}
          </Typography>
          <Typography variant="body" color="muted">
            {STRINGS.calendar.subtitle}
          </Typography>
        </View>
        <View className="flex-row items-center gap-2">
          <Button variant="secondary" size="sm" onPress={onPrev}>
            {STRINGS.calendar.previous}
          </Button>
          <Button variant="outline" size="sm" onPress={onToday}>
            {STRINGS.calendar.today}
          </Button>
          <Button variant="secondary" size="sm" onPress={onNext}>
            {STRINGS.calendar.next}
          </Button>
        </View>
      </View>

      <View className="mt-3">
        <TabBar
          tabs={VIEW_TABS.map((tab) => tab.label)}
          active={activeLabel}
          onChange={(label) => {
            const next = VIEW_TABS.find((tab) => tab.label === label);
            if (next) onChangeMode(next.value);
          }}
        />
      </View>
    </View>
  );
};

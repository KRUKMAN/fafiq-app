import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { cn } from '@/components/ui/cn';
import type { TimelineItem } from '@/schemas/timelineItem';
import { formatTimestampShort } from '@/lib/formatters/dates';

export type TimelineFilterMode = 'important' | 'all';

export type TimelineFilters = {
  mode: TimelineFilterMode;
  showAudit: boolean;
  showSchedule: boolean;
};

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  mode: 'important',
  showAudit: true,
  showSchedule: true,
};

export function TimelineFeed({
  items,
  filters,
  onChangeFilters,
  scrollable = true,
}: {
  items: TimelineItem[];
  filters: TimelineFilters;
  onChangeFilters: (next: TimelineFilters) => void;
  scrollable?: boolean;
}) {
  const visible = useMemo(() => {
    return items.filter((item) => {
      if (item.kind === 'audit' && !filters.showAudit) return false;
      if (item.kind === 'schedule' && !filters.showSchedule) return false;
      return true;
    });
  }, [items, filters.showAudit, filters.showSchedule]);

  const content = scrollable ? (
    <FlashList
      data={visible}
      keyExtractor={(it) => it.id}
      renderItem={({ item, index }) => <TimelineRow item={item} isLast={index === visible.length - 1} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  ) : (
    <View className="gap-4 pb-6">
      {visible.map((item, idx) => (
        <TimelineRow key={item.id} item={item} isLast={idx === visible.length - 1} />
      ))}
    </View>
  );

  return (
    <View className="flex-1">
      <TimelineFilterBar filters={filters} onChange={onChangeFilters} />

      {visible.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Typography variant="body" color="muted">
            No timeline items match your filters.
          </Typography>
        </View>
      ) : (
        <View className="flex-1">{content}</View>
      )}
    </View>
  );
}

function TimelineFilterBar({
  filters,
  onChange,
}: {
  filters: TimelineFilters;
  onChange: (next: TimelineFilters) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      <Button
        variant={filters.mode === 'important' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => onChange({ ...filters, mode: 'important' })}>
        Important
      </Button>
      <Button
        variant={filters.mode === 'all' ? 'primary' : 'outline'}
        size="sm"
        onPress={() => onChange({ ...filters, mode: 'all' })}>
        All
      </Button>

      <View className="w-2" />

      <Button
        variant={filters.showSchedule ? 'secondary' : 'outline'}
        size="sm"
        onPress={() => onChange({ ...filters, showSchedule: !filters.showSchedule })}>
        Schedule
      </Button>
      <Button
        variant={filters.showAudit ? 'secondary' : 'outline'}
        size="sm"
        onPress={() => onChange({ ...filters, showAudit: !filters.showAudit })}>
        Activity
      </Button>
    </View>
  );
}

function TimelineRow({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const dotClass =
    item.kind === 'schedule' ? 'bg-primary' : item.system ? 'bg-muted-foreground' : 'bg-foreground';

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className={cn('w-3 h-3 rounded-full mt-1', dotClass)} />
        {!isLast ? <View className="flex-1 w-px bg-border mt-1" /> : null}
      </View>

      <Card className="flex-1 p-3">
        <View className="flex-row items-center justify-between">
          <Typography variant="caption" color="muted">
            {formatTimestampShort(item.occurred_at)}
          </Typography>
          <Typography variant="label" color="muted" className="text-[11px] uppercase tracking-wide">
            {item.kind === 'schedule' ? 'schedule' : item.system ? 'system' : 'activity'}
          </Typography>
        </View>

        <Typography variant="body" className="text-sm font-semibold text-foreground mt-1">
          {item.title}
        </Typography>

        {item.subtitle ? (
          <Typography variant="label" color="muted" className="text-[11px] uppercase tracking-wide mt-1">
            {item.subtitle}
          </Typography>
        ) : null}

        {item.details.length ? (
          <View className="mt-3 gap-1">
            {item.details.slice(0, 10).map((row) => (
              <View key={row.label} className="flex-row justify-between gap-3">
                <Typography variant="caption" color="muted">
                  {row.label}
                </Typography>
                <Typography variant="caption" className="text-xs font-medium text-foreground text-right flex-1">
                  {row.value}
                </Typography>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

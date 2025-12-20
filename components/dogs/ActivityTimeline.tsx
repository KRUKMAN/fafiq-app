import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDogTimeline } from '@/hooks/useDogTimeline';
import { formatTimestampShort } from '@/lib/formatters/dates';
import { formatEventTypeLabel, toActivityEventDetailRows } from '@/lib/viewModels/activityEventView';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { cn } from '@/components/ui/cn';

export const ActivityTimeline = ({ orgId, dogId }: { orgId: string; dogId: string }) => {
  const { data, isLoading, error } = useDogTimeline(orgId, dogId);

  if (isLoading) {
    return (
      <View className="items-center justify-center py-6">
        <ActivityIndicator />
        <Typography variant="body" color="muted" className="mt-2">
          Loading timeline...
        </Typography>
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center justify-center py-6">
        <Typography variant="body" className="text-sm font-semibold text-foreground">
          Failed to load timeline
        </Typography>
        <Typography variant="caption" color="muted" className="mt-1">
          {(error as Error).message || 'Please try again shortly.'}
        </Typography>
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View className="items-center justify-center py-6">
        <Typography variant="body" color="muted">
          No activity yet for this dog.
        </Typography>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {data.map((event, idx) => {
        const isLast = idx === data.length - 1;
        const details = toActivityEventDetailRows(event);
        const isSystem = Boolean((event.related as any)?.system);

        return (
          <View key={event.id} className="flex-row gap-3">
            <View className="items-center">
              <View className={cn('w-3 h-3 rounded-full mt-1', isSystem ? 'bg-muted-foreground' : 'bg-foreground')} />
              {!isLast ? <View className="flex-1 w-px bg-border mt-1" /> : null}
            </View>

            <Card className="flex-1 p-3">
              <View className="flex-row items-center justify-between">
                <Typography variant="caption" color="muted">
                  {formatTimestampShort(event.created_at)}
                </Typography>
                {isSystem ? (
                  <Typography variant="label" color="muted" className="text-[11px] uppercase tracking-wide">
                    system
                  </Typography>
                ) : null}
              </View>

              <Typography variant="body" className="text-sm font-semibold text-foreground mt-1">
                {event.summary}
              </Typography>

              <Typography variant="label" color="muted" className="text-[11px] uppercase tracking-wide mt-1">
                {formatEventTypeLabel(event.event_type)}
              </Typography>

              {details.length ? (
                <View className="mt-3 gap-1">
                  {details.map((row) => (
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
      })}
    </View>
  );
};


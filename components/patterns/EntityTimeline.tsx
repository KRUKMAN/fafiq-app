import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IMPORTANT_AUDIT_EVENT_TYPES, IMPORTANT_SCHEDULE_SOURCE_TYPES } from '@/constants/timeline';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useContactTimeline } from '@/hooks/useContactTimeline';
import { useDogTimeline } from '@/hooks/useDogTimeline';
import { useMemberActivity } from '@/hooks/useMemberActivity';
import { useTransportTimeline } from '@/hooks/useTransportTimeline';
import { mergeTimelineItems, toAuditTimelineItem, toScheduleTimelineItem } from '@/lib/viewModels/timeline';
import type { TimelineItem } from '@/schemas/timelineItem';
import { TimelineFeed, DEFAULT_TIMELINE_FILTERS, type TimelineFilters } from '@/components/patterns/TimelineFeed';
import { Typography } from '@/components/ui/Typography';

type Scope =
  | { kind: 'dog'; dogId: string }
  | { kind: 'transport'; transportId: string }
  | { kind: 'contact'; contactId: string }
  | { kind: 'membership'; membershipId: string };

const IMPORTANT_AUDIT = new Set<string>(IMPORTANT_AUDIT_EVENT_TYPES as unknown as string[]);
const IMPORTANT_SCHEDULE = new Set<string>(IMPORTANT_SCHEDULE_SOURCE_TYPES as unknown as string[]);

export function EntityTimeline({
  orgId,
  scope,
  scrollable = true,
}: {
  orgId: string;
  scope: Scope;
  scrollable?: boolean;
}) {
  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS);

  const range = useMemo(() => {
    const start = dayjs().subtract(60, 'day').startOf('day').toISOString();
    const end = dayjs().add(30, 'day').endOf('day').toISOString();
    return { startDate: start, endDate: end };
  }, []);

  const dogAudit = useDogTimeline(orgId, scope.kind === 'dog' ? scope.dogId : undefined);
  const transportAudit = useTransportTimeline(orgId, scope.kind === 'transport' ? scope.transportId : undefined);
  const contactAudit = useContactTimeline(orgId, scope.kind === 'contact' ? scope.contactId : undefined);
  const memberAudit = useMemberActivity(orgId, scope.kind === 'membership' ? scope.membershipId : undefined);

  const calendarParams = useMemo(() => {
    if (scope.kind === 'dog') return { ...range, dogId: scope.dogId };
    if (scope.kind === 'transport') return { ...range, linkType: 'transport', linkId: scope.transportId };
    if (scope.kind === 'contact') return { ...range, contactId: scope.contactId };
    return { ...range, assignedMembershipId: scope.membershipId };
  }, [range, scope]);

  const scheduleQuery = useCalendarEvents(orgId, calendarParams);

  const auditQuery = scope.kind === 'dog' ? dogAudit : scope.kind === 'transport' ? transportAudit : scope.kind === 'contact' ? contactAudit : memberAudit;

  const isLoading = auditQuery.isLoading || scheduleQuery.isLoading;
  const error = (auditQuery.error as Error | null) ?? (scheduleQuery.error as Error | null);

  const items: TimelineItem[] = useMemo(() => {
    const audit = (auditQuery.data ?? []).map(toAuditTimelineItem);
    const schedule = (scheduleQuery.data ?? []).map(toScheduleTimelineItem);

    const merged = mergeTimelineItems([...audit, ...schedule]);
    if (filters.mode !== 'important') return merged;

    return merged.filter((item) => {
      if (item.kind === 'audit') return IMPORTANT_AUDIT.has(item.subtitle);
      if (item.kind === 'schedule') {
        const type = (item.subtitle.split(' · ')[0] ?? '').trim();
        return IMPORTANT_SCHEDULE.has(type);
      }
      return true;
    });
  }, [auditQuery.data, scheduleQuery.data, filters.mode]);

  if (isLoading) {
    return (
      <View className="items-center justify-center py-6">
        <Typography variant="body" color="muted">
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
          {error.message || 'Please try again shortly.'}
        </Typography>
      </View>
    );
  }

  return <TimelineFeed items={items} filters={filters} onChangeFilters={setFilters} scrollable={scrollable} />;
}

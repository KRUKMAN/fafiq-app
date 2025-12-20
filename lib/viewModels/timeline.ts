import type { CalendarEvent } from '@/schemas/calendarEvent';
import type { ActivityEvent } from '@/schemas/activityEvent';
import type { TimelineItem } from '@/schemas/timelineItem';
import { formatEventTypeLabel, toActivityEventDetailRows } from '@/lib/viewModels/activityEventView';
import { formatTimestampShort } from '@/lib/formatters/dates';

const toIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
};

export const toAuditTimelineItem = (event: ActivityEvent): TimelineItem => {
  const system = Boolean((event.related as any)?.system);
  return {
    id: `audit_${event.id}`,
    kind: 'audit',
    occurred_at: toIso(event.created_at),
    title: event.summary,
    subtitle: formatEventTypeLabel(event.event_type),
    event_type: event.event_type,
    system,
    details: toActivityEventDetailRows(event),
  };
};

export const toScheduleTimelineItem = (event: CalendarEvent): TimelineItem => {
  const subtitleParts = [event.source_type];
  if (event.status) subtitleParts.push(event.status);
  return {
    id: `sched_${event.event_id}`,
    kind: 'schedule',
    occurred_at: toIso(event.start_at),
    title: event.title,
    subtitle: subtitleParts.join(' · '),
    source_type: event.source_type,
    system: false,
    details: [
      { label: 'when', value: `${formatTimestampShort(event.start_at)} → ${formatTimestampShort(event.end_at)}` },
      ...(event.link_type && event.link_type !== 'none' && event.link_id
        ? [{ label: 'link', value: `${event.link_type}:${event.link_id}` }]
        : []),
    ],
  };
};

export const mergeTimelineItems = (items: TimelineItem[]) =>
  items
    .slice()
    .sort((a, b) => (b.occurred_at ?? '').localeCompare(a.occurred_at ?? ''));

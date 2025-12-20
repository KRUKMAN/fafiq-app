import dayjs from 'dayjs';
import React from 'react';
import { View } from 'react-native';

import { Drawer } from '@/components/patterns/Drawer';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';
import { CalendarEvent } from '@/schemas/calendarEvent';

type CalendarEventDrawerProps = {
  event: CalendarEvent | null;
  onClose: () => void;
  onOpenLink?: (event: CalendarEvent) => void;
};

const formatTimeRange = (start: string, end: string) => {
  const startAt = dayjs(start);
  const endAt = dayjs(end);
  if (!startAt.isValid() || !endAt.isValid()) return `${start} - ${end}`;
  return `${startAt.format('MMM D, HH:mm')} - ${endAt.format('MMM D, HH:mm')}`;
};

export const CalendarEventDrawer = ({ event, onClose, onOpenLink }: CalendarEventDrawerProps) => {
  if (!event) return null;

  return (
    <Drawer open={Boolean(event)} onClose={onClose} widthClassName="max-w-xl">
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <View>
          <Typography variant="h3" className="text-xl">
            {event.title}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            {STRINGS.calendar.detail.heading}
          </Typography>
        </View>
        <Button variant="outline" size="sm" onPress={onClose}>
          {STRINGS.common.close}
        </Button>
      </View>

      <View className="px-4 py-4 gap-3">
        <InfoRow
          label={STRINGS.calendar.addEvent.typeLabel}
          value={STRINGS.calendar.typeLabels[event.source_type as keyof typeof STRINGS.calendar.typeLabels] ?? event.source_type}
        />
        <InfoRow label={STRINGS.calendar.detail.whenLabel} value={formatTimeRange(event.start_at, event.end_at)} />
        {event.location ? <InfoRow label={STRINGS.calendar.addEvent.locationLabel} value={event.location} /> : null}
        {event.status ? <InfoRow label={STRINGS.calendar.detail.statusLabel} value={event.status} /> : null}

        {event.link_id && onOpenLink ? (
          <Button variant="secondary" onPress={() => onOpenLink(event)}>
            {STRINGS.calendar.detail.openLink}
          </Button>
        ) : null}

        <View className="mt-2 gap-2">
          <Typography variant="label">{STRINGS.calendar.detail.reminders}</Typography>
          {event.reminders && event.reminders.length > 0 ? (
            event.reminders.map((reminder) => (
              <InfoRow
                key={reminder.deterministic_key}
                label={`${reminder.offset_minutes} min`}
                value={dayjs(reminder.scheduled_at).isValid() ? dayjs(reminder.scheduled_at).format('MMM D, HH:mm') : reminder.scheduled_at}
              />
            ))
          ) : (
            <Typography variant="bodySmall" color="muted">
              {STRINGS.calendar.detail.noReminders}
            </Typography>
          )}
        </View>
      </View>
    </Drawer>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="gap-1">
    <Typography variant="caption" color="muted">
      {label}
    </Typography>
    <Typography variant="body">{value}</Typography>
  </View>
);

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';

import { fetchCalendarEvents, buildReminderDeterministicId } from '@/lib/data/calendarEvents';
import { ensureNotificationHandler } from '@/lib/notifications';
import { STRINGS, formatNotificationSyncSuccess } from '@/constants/strings';
import { CalendarReminder } from '@/schemas/calendarEvent';

type StatusVariant = 'info' | 'success' | 'error';

export const useNotificationSync = (orgId?: string | null, windowDays = 14) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<{ variant: StatusVariant; message: string | null }>({
    variant: 'info',
    message: null,
  });

  const syncNotifications = useCallback(async () => {
    if (!orgId) {
      setStatus({ variant: 'error', message: STRINGS.notifications.noOrg });
      return;
    }

    const startDate = dayjs().toISOString();
    const endDate = dayjs().add(windowDays, 'day').endOf('day').toISOString();

    // Web skips local notification scheduling; surface info but keep StatusMessage as the primary UX.
    if (Platform.OS === 'web') {
      setStatus({
        variant: 'info',
        message: STRINGS.notifications.webNotice,
      });
      setLastSyncAt(new Date());
      return;
    }

    setIsSyncing(true);
    try {
      ensureNotificationHandler();

      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      let permissionStatus = currentStatus;
      if (permissionStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        permissionStatus = requested.status;
      }

      if (permissionStatus !== 'granted') {
        throw new Error(STRINGS.notifications.permissionMissing);
      }

      const events = await fetchCalendarEvents({
        orgId,
        startDate,
        endDate,
        fallbackToMockOnError: false,
        requireLive: true,
      });
      const reminders = events.flatMap((event) =>
        (event.reminders ?? []).map((reminder) => ({ event, reminder }))
      );
      const desiredIds = new Set(
        reminders.map(({ event, reminder }) => buildReminderDeterministicId(event, reminder))
      );

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledByDeterministicId = new Map<string, string>();
      for (const note of scheduled) {
        const deterministicId =
          (note.content?.data as any)?.deterministicKey ??
          (note.content?.data as any)?.deterministicId ??
          (note.content?.data as any)?.reminderId;
        if (deterministicId) {
          scheduledByDeterministicId.set(String(deterministicId), note.identifier);
        }
      }

      for (const [deterministicId, identifier] of scheduledByDeterministicId.entries()) {
        if (!desiredIds.has(deterministicId)) {
          await Notifications.cancelScheduledNotificationAsync(identifier);
        }
      }

      for (const item of reminders) {
        const deterministicId = buildReminderDeterministicId(item.event, item.reminder);
        if (scheduledByDeterministicId.has(deterministicId)) continue;

        const triggerDate = new Date((item.reminder as CalendarReminder).scheduled_at);
        if (!Number.isFinite(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.event.title,
            body: item.event.location ?? undefined,
            data: {
              deterministicId,
              eventId: item.event.event_id,
              eventType: item.event.source_type,
              linkId: item.event.link_id,
              linkType: item.event.link_type,
              reminderOffset: item.reminder.offset_minutes,
            },
          },
          trigger: triggerDate,
        });
      }

      setStatus({ variant: 'success', message: formatNotificationSyncSuccess(windowDays) });
      setLastSyncAt(new Date());
    } catch (err: any) {
      setStatus({
        variant: 'error',
        message: err?.message ?? STRINGS.notifications.syncFailure,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [orgId, windowDays]);

  return {
    isSyncing,
    lastSyncAt,
    status,
    syncNotifications,
  };
};

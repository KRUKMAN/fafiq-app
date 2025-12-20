import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Href, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Calendar as BigCalendar, type ICalendarEventBase } from 'react-native-big-calendar';

import { CalendarEventDrawer } from '@/components/calendar/CalendarEventDrawer';
import { CalendarFilters, PickerDrawer } from '@/components/calendar/CalendarFilters';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/patterns/DataView';
import { Drawer } from '@/components/patterns/Drawer';
import { OrgSelector } from '@/components/patterns/OrgSelector';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Typography } from '@/components/ui/Typography';
import { STRINGS } from '@/constants/strings';
import { UI_COLORS } from '@/constants/uiColors';
import { useAppReconciliation } from '@/hooks/useAppReconciliation';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useSmartNotification } from '@/hooks/useSmartNotification';
import { useDogs } from '@/hooks/useDogs';
import { useOrgContacts } from '@/hooks/useOrgContacts';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { createCalendarEvent } from '@/lib/data/calendarEvents';
import { CalendarEvent, CalendarSourceType } from '@/schemas/calendarEvent';
import { useSessionStore } from '@/stores/sessionStore';

type CalendarDisplayEvent = ICalendarEventBase & {
  id: string;
  color: string;
  data: CalendarEvent;
};

const EVENT_COLORS: Record<string, string> = {
  medical: UI_COLORS.calendarMedical,
  quarantine: UI_COLORS.calendarQuarantine,
  transport: UI_COLORS.calendarTransport,
  general: UI_COLORS.calendarGeneral,
  system_task: UI_COLORS.calendarSystemTask,
  finance: UI_COLORS.calendarFinance,
  external: UI_COLORS.calendarExternal,
  quarantine_artifact: UI_COLORS.calendarQuarantine,
};

const MANUAL_EVENT_TYPES: CalendarSourceType[] = ['general', 'system_task', 'finance', 'external'];

const toInputValue = (value: dayjs.Dayjs) => value.format('YYYY-MM-DDTHH:mm');

export default function CalendarScreen() {
  const session = useSessionStore();
  const { activeOrgId, memberships, ready, switchOrg } = session;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();

  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(() => dayjs());
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [filters, setFilters] = useState<{
    search: string;
    sourceTypes: CalendarSourceType[];
    dogId: string | null;
    contactId: string | null;
    stage: string | null;
  }>({ search: '', sourceTypes: [], dogId: null, contactId: null, stage: null });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addMode, setAddMode] = useState<'menu' | 'general'>('menu');
  const [formDogPicker, setFormDogPicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    type: CalendarSourceType;
    start: string;
    end: string;
    location: string;
    reminderOffset: string;
    linkDogId: string | null;
  }>(() => {
    const start = dayjs().startOf('hour').add(1, 'hour');
    return {
      title: '',
      type: 'general',
      start: toInputValue(start),
      end: toInputValue(start.add(1, 'hour')),
      location: '',
      reminderOffset: '60',
      linkDogId: null,
    };
  });

  const range = useMemo(() => {
    if (mode === 'day') {
      return {
        startDate: currentDate.startOf('day'),
        endDate: currentDate.endOf('day'),
      };
    }
    if (mode === 'month') {
      return {
        startDate: currentDate.startOf('month'),
        endDate: currentDate.endOf('month'),
      };
    }
    return {
      startDate: currentDate.startOf('week'),
      endDate: currentDate.endOf('week'),
    };
  }, [currentDate, mode]);

  const queryStart = useMemo(() => {
    const parsed = customRange.start ? dayjs(customRange.start) : null;
    return parsed && parsed.isValid() ? parsed.startOf('day') : range.startDate;
  }, [customRange.start, range.startDate]);

  const queryEnd = useMemo(() => {
    const parsed = customRange.end ? dayjs(customRange.end) : null;
    return parsed && parsed.isValid() ? parsed.endOf('day') : range.endDate;
  }, [customRange.end, range.endDate]);

  const normalizedEnd = useMemo(
    () => (queryEnd.isBefore(queryStart) ? queryStart.endOf('day') : queryEnd),
    [queryEnd, queryStart]
  );

  const { dogStages } = useOrgSettings(activeOrgId ?? undefined);
  const { data: dogList } = useDogs(activeOrgId ?? undefined);
  const { data: contactList } = useOrgContacts(activeOrgId ?? undefined);

  const dogOptions = useMemo(
    () => (dogList ?? []).map((dog) => ({ id: dog.id, label: dog.name })),
    [dogList]
  );
  const contactOptions = useMemo(
    () => (contactList ?? []).map((c) => ({ id: c.id, label: c.display_name })),
    [contactList]
  );

  const { data, isLoading, error } = useCalendarEvents(activeOrgId ?? undefined, {
    startDate: queryStart.toISOString(),
    endDate: normalizedEnd.toISOString(),
    sourceTypes: filters.sourceTypes.length ? filters.sourceTypes : undefined,
    dogId: filters.dogId ?? undefined,
    contactId: filters.contactId ?? undefined,
    stage: filters.stage ?? undefined,
    search: filters.search || undefined,
    fallbackToMockOnError: true,
  });

  const { status: notificationStatus, isSyncing, syncNotifications } = useNotificationSync(activeOrgId, 14);
  const { message: smartMessage, notify: smartNotify } = useSmartNotification();

  const resetDraft = useCallback(() => {
    const start = dayjs().startOf('hour').add(1, 'hour');
    setDraft({
      title: '',
      type: 'general',
      start: toInputValue(start),
      end: toInputValue(start.add(1, 'hour')),
      location: '',
      reminderOffset: '60',
      linkDogId: null,
    });
    setFormError(null);
    setAddMode('general');
  }, []);

  useAppReconciliation({
    orgId: activeOrgId,
    onResume: async () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      await syncNotifications();
    },
  });

  useEffect(() => {
    if (notificationStatus.message) {
      smartNotify(notificationStatus.variant, notificationStatus.message);
    }
  }, [notificationStatus, smartNotify]);

  const calendarEvents: CalendarDisplayEvent[] = useMemo(() => {
    if (!data) return [];
    return data
      .map((event) => {
        const start = new Date(event.start_at);
        const end = new Date(event.end_at);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
        const color = EVENT_COLORS[event.source_type] ?? UI_COLORS.calendarGeneral;
        return {
          id: event.event_id,
          title: event.title,
          start,
          end,
          color,
          data: event,
        } as CalendarDisplayEvent;
      })
      .filter(Boolean) as CalendarDisplayEvent[];
  }, [data]);

  const handlePressEvent = useCallback(
    (event: CalendarDisplayEvent) => {
      const record = event.data;
      if (record.source_type === 'transport' && record.link_id) {
        router.push(`/transports/${record.link_id}` as Href);
        return;
      }
      if ((record.source_type === 'medical' || record.source_type === 'quarantine') && record.link_id) {
        router.push(`/dogs/${record.link_id}` as Href);
        return;
      }
      setSelectedEvent(record);
    },
    [router]
  );

  const handleOpenLinkedRecord = useCallback(
    (event: CalendarEvent) => {
      if (event.source_type === 'transport' && event.link_id) {
        router.push(`/transports/${event.link_id}` as Href);
        return;
      }
      if (event.link_type === 'dog' && event.link_id) {
        router.push(`/dogs/${event.link_id}` as Href);
        return;
      }
    },
    [router]
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => prev.subtract(1, mode));
  }, [mode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => prev.add(1, mode));
  }, [mode]);

  const calendarHeight = Math.max(height - 320, 420);
  const statusVariant = notificationStatus.message ? notificationStatus.variant : smartMessage?.variant ?? 'info';

  const createEventMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      smartNotify('success', STRINGS.calendar.addEvent.createSuccess);
      setAddDrawerOpen(false);
      setAddMode('menu');
      resetDraft();
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.message ?? STRINGS.calendar.addEvent.createError);
    },
  });

  const handleSubmitGeneralEvent = async () => {
    if (!activeOrgId) {
      setFormError(STRINGS.calendar.addEvent.validation.missingOrg);
      return;
    }
    const start = dayjs(draft.start);
    const end = dayjs(draft.end);
    if (!start.isValid() || !end.isValid()) {
      setFormError(STRINGS.calendar.addEvent.validation.invalidDates);
      return;
    }
    if (end.isBefore(start)) {
      setFormError(STRINGS.calendar.addEvent.validation.endBeforeStart);
      return;
    }
    const offsetMinutes = Number(draft.reminderOffset ?? 0);
    const reminders = Number.isFinite(offsetMinutes) && offsetMinutes >= 0 ? [{ offset_minutes: offsetMinutes }] : [];
    createEventMutation.mutate({
      org_id: activeOrgId,
      title: draft.title || STRINGS.calendar.addEvent.general,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      type: draft.type,
      location: draft.location || null,
      link_type: draft.linkDogId ? 'dog' : 'none',
      link_id: draft.linkDogId,
      reminders,
    });
  };

  const handleResetFilters = useCallback(() => {
    setFilters({ search: '', sourceTypes: [], dogId: null, contactId: null, stage: null });
    setCustomRange({});
  }, []);

  return (
    <ScreenGuard session={session}>
      <View className="flex-1 bg-background">
        <PageHeader
          title={STRINGS.calendar.title}
          subtitle={STRINGS.calendar.subtitle}
          actions={[
            <Button key="add" variant="primary" size="md" leftIcon={<Plus size={16} color={UI_COLORS.white} />} onPress={() => { setAddDrawerOpen(true); setAddMode('menu'); setFormError(null); }}>
              {STRINGS.calendar.addEvent.cta}
            </Button>,
            <Button key="sync" variant="secondary" size="md" loading={isSyncing} onPress={syncNotifications}>
              {isSyncing ? STRINGS.calendar.syncing : STRINGS.calendar.syncNow}
            </Button>,
            <OrgSelector
              key="org"
              activeOrgId={activeOrgId}
              memberships={memberships}
              switchOrg={switchOrg}
              ready={ready}
            />,
          ]}
        />

        <View className="px-6 pt-3 gap-2">
          <StatusMessage variant={statusVariant} message={notificationStatus.message ?? smartMessage?.text ?? null} />
        </View>

        <CalendarFilters
          search={filters.search}
          onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          sourceTypes={filters.sourceTypes}
          onToggleSourceType={(type) =>
            setFilters((prev) => {
              const exists = prev.sourceTypes.includes(type);
              return { ...prev, sourceTypes: exists ? prev.sourceTypes.filter((t) => t !== type) : [...prev.sourceTypes, type] };
            })
          }
          dogOptions={dogOptions}
          contactOptions={contactOptions}
          stageOptions={dogStages}
          selectedDogId={filters.dogId}
          selectedContactId={filters.contactId}
          selectedStage={filters.stage}
          startDate={customRange.start ?? range.startDate.format('YYYY-MM-DD')}
          endDate={customRange.end ?? range.endDate.format('YYYY-MM-DD')}
          onChangeDates={(patch) => setCustomRange((prev) => ({ ...prev, ...patch }))}
          onSelectDog={(id) => setFilters((prev) => ({ ...prev, dogId: id }))}
          onSelectContact={(id) => setFilters((prev) => ({ ...prev, contactId: id }))}
          onSelectStage={(stage) => setFilters((prev) => ({ ...prev, stage }))}
          onReset={handleResetFilters}
        />

        <CalendarHeader
          currentDate={currentDate}
          mode={mode}
          onChangeMode={setMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={() => setCurrentDate(dayjs())}
        />

        <View className="flex-1 px-4 pb-6">
          <DataView
            data={calendarEvents}
            isLoading={isLoading}
            error={error}
            isEmpty={(events) => events.length === 0}
            loadingLabel={STRINGS.calendar.loading}
            emptyComponent={<EmptyState title={STRINGS.calendar.empty} />}>
            {(events) => (
              <BigCalendar
                events={events}
                height={calendarHeight}
                date={currentDate.toDate()}
                mode={mode}
                eventCellStyle={(event) => ({
                  backgroundColor: event.color,
                  borderColor: event.color,
                })}
                swipeEnabled
                showAllDayEventCell
                onPressEvent={handlePressEvent}
                weekStartsOn={1}
                overlapOffset={16}
              />
            )}
          </DataView>
        </View>

        <CalendarEventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} onOpenLink={handleOpenLinkedRecord} />

        <Drawer
          open={addDrawerOpen}
          onClose={() => {
            setAddDrawerOpen(false);
            setAddMode('menu');
            setFormError(null);
          }}
          widthClassName="max-w-xl">
          <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
            <Typography variant="h3" className="text-xl">
              {STRINGS.calendar.addEvent.cta}
            </Typography>
            <Button variant="outline" size="sm" onPress={() => setAddDrawerOpen(false)}>
              {STRINGS.common.close}
            </Button>
          </View>

          {addMode === 'menu' ? (
            <View className="px-4 py-4 gap-3">
              <Button variant="primary" onPress={() => { setAddMode('general'); resetDraft(); }}>
                {STRINGS.calendar.addEvent.general}
              </Button>
              <Button
                variant="secondary"
                onPress={() => {
                  setAddDrawerOpen(false);
                  router.push('/dogs' as Href);
                }}>
                {STRINGS.calendar.addEvent.medical}
              </Button>
              <Button
                variant="secondary"
                onPress={() => {
                  setAddDrawerOpen(false);
                  router.push({ pathname: '/transports', params: filters.dogId ? { createDogId: filters.dogId } : undefined } as any);
                }}>
                {STRINGS.calendar.addEvent.transport}
              </Button>
            </View>
          ) : (
            <View className="px-4 py-4 gap-3">
              <Input
                label={STRINGS.calendar.addEvent.titleLabel}
                value={draft.title}
                onChangeText={(val) => setDraft((prev) => ({ ...prev, title: val }))}
                placeholder={STRINGS.calendar.addEvent.general}
              />
              <Input
                label={STRINGS.calendar.addEvent.startLabel}
                value={draft.start}
                onChangeText={(val) => setDraft((prev) => ({ ...prev, start: val }))}
                placeholder={STRINGS.calendar.addEvent.datetimePlaceholder}
              />
              <Input
                label={STRINGS.calendar.addEvent.endLabel}
                value={draft.end}
                onChangeText={(val) => setDraft((prev) => ({ ...prev, end: val }))}
                placeholder={STRINGS.calendar.addEvent.datetimePlaceholder}
              />
              <Input
                label={STRINGS.calendar.addEvent.locationLabel}
                value={draft.location}
                onChangeText={(val) => setDraft((prev) => ({ ...prev, location: val }))}
                placeholder={STRINGS.calendar.addEvent.locationLabel}
              />

              <View className="gap-2">
                <Typography variant="label">{STRINGS.calendar.addEvent.typeLabel}</Typography>
                <View className="flex-row flex-wrap gap-2">
                  {MANUAL_EVENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant={draft.type === type ? 'primary' : 'outline'}
                      size="sm"
                      onPress={() => setDraft((prev) => ({ ...prev, type }))}>
                      {STRINGS.calendar.typeLabels[type as keyof typeof STRINGS.calendar.typeLabels] ?? type}
                    </Button>
                  ))}
                </View>
              </View>

              <Button variant="outline" onPress={() => setFormDogPicker(true)}>
                {draft.linkDogId
                  ? `${STRINGS.calendar.addEvent.linkDogLabel}: ${
                      dogOptions.find((d) => d.id === draft.linkDogId)?.label ?? draft.linkDogId
                    }`
                  : STRINGS.calendar.addEvent.linkDogLabel}
              </Button>

              <Input
                label={STRINGS.calendar.addEvent.reminderOffsetLabel}
                value={draft.reminderOffset}
                onChangeText={(val) => setDraft((prev) => ({ ...prev, reminderOffset: val }))}
                keyboardType="numeric"
              />

              <StatusMessage variant="error" message={formError} />

              <View className="flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onPress={() => {
                    resetDraft();
                    setAddMode('menu');
                  }}>
                  {STRINGS.common.cancel}
                </Button>
                <Button variant="primary" loading={createEventMutation.isPending} onPress={handleSubmitGeneralEvent}>
                  {STRINGS.common.save}
                </Button>
              </View>
            </View>
          )}
        </Drawer>

        <PickerDrawer
          title={STRINGS.calendar.addEvent.linkDogLabel}
          open={formDogPicker}
          onClose={() => setFormDogPicker(false)}
          options={dogOptions}
          onSelect={(id) => {
            setDraft((prev) => ({ ...prev, linkDogId: id }));
            setFormDogPicker(false);
          }}
        />
      </View>
    </ScreenGuard>
  );
}

import dayjs from 'dayjs';

import { getMockCalendarEvents } from '@/lib/mocks/calendarEvents';
import { supabase } from '@/lib/supabase';
import {
  CalendarEvent,
  calendarEventSchema,
  calendarReminderSchema,
  CalendarReminder,
  CalendarSourceType,
} from '@/schemas/calendarEvent';
import { formatSupabaseError } from './errors';

type FetchCalendarEventsParams = {
  orgId: string;
  startDate?: string;
  endDate?: string;
  sourceTypes?: CalendarSourceType[];
  dogId?: string;
  contactId?: string;
  stage?: string;
  visibility?: string;
  search?: string;
  fallbackToMockOnError?: boolean;
  requireLive?: boolean;
};

type CalendarReminderInput = {
  offset_minutes?: number;
  type?: CalendarReminder['type'];
  deterministic_key?: string;
  payload?: Record<string, unknown>;
};

type NewCalendarEventInput = {
  org_id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: CalendarSourceType;
  status?: string | null;
  location?: string | null;
  link_type?: string;
  link_id?: string | null;
  visibility?: string | null;
  meta?: Record<string, unknown>;
  reminders?: CalendarReminderInput[];
};

const normalizeReminder = (reminder: any): CalendarReminder =>
  calendarReminderSchema.parse({
    ...reminder,
    offset_minutes: typeof reminder?.offset_minutes === 'number' ? reminder.offset_minutes : Number(reminder?.offset_minutes ?? 0),
    scheduled_at: reminder?.scheduled_at ?? reminder?.scheduledAt ?? '',
    deterministic_key: reminder?.deterministic_key ?? reminder?.deterministicKey ?? '',
    payload: reminder?.payload ?? {},
  });

const normalizeEvent = (event: any): CalendarEvent =>
  calendarEventSchema.parse({
    ...event,
    source_type: event.source_type ?? event.type ?? 'general',
    source_id: event.source_id ?? event.id ?? null,
    link_type: event.link_type ?? 'none',
    link_id: event.link_id ?? null,
    visibility: event.visibility ?? 'org',
    location: event.location ?? null,
    status: event.status ?? null,
    meta: event.meta ?? {},
    reminders: Array.isArray(event?.reminders) ? event.reminders.map(normalizeReminder) : [],
  });

export const fetchCalendarEvents = async (params: FetchCalendarEventsParams): Promise<CalendarEvent[]> => {
  const start = dayjs(params.startDate ?? undefined).isValid()
    ? dayjs(params.startDate).startOf('day')
    : dayjs().startOf('day');
  const end = dayjs(params.endDate ?? undefined).isValid()
    ? dayjs(params.endDate).endOf('day')
    : dayjs().add(30, 'day').endOf('day');

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  if (!supabase) {
    if (params.requireLive) {
      throw new Error('Supabase env vars missing; calendar sync requires a live backend.');
    }
    const mockEvents = await getMockCalendarEvents(params.orgId, startIso, endIso);
    return mockEvents.map(normalizeEvent).sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  const { data, error } = await supabase.rpc('get_calendar_events', {
    p_org_id: params.orgId,
    p_start: startIso,
    p_end: endIso,
    p_source_types: params.sourceTypes ?? null,
    p_dog_id: params.dogId ?? null,
    p_contact_id: params.contactId ?? null,
    p_stage: params.stage ?? null,
    p_visibility: params.visibility ?? null,
    p_search: params.search ?? null,
  });

  if (!error) {
    return (data ?? []).map(normalizeEvent).sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  const message = formatSupabaseError(error, 'Failed to load calendar events');
  if (params.fallbackToMockOnError && !params.requireLive) {
    console.warn(message, 'Falling back to mock calendar events.');
    const mockEvents = await getMockCalendarEvents(params.orgId, startIso, endIso);
    return mockEvents.map(normalizeEvent).sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  throw new Error(message);
};

export const buildReminderDeterministicId = (event: CalendarEvent, reminder: CalendarReminder) => {
  if (reminder.deterministic_key) return reminder.deterministic_key;
  const dateKey = dayjs(reminder.scheduled_at || event.start_at).format('YYYY-MM-DD');
  const sourceId = event.source_id ?? event.event_id;
  return `${event.source_type}_${sourceId}_${dateKey}_${reminder.offset_minutes ?? 0}`;
};

export const createCalendarEvent = async (input: NewCalendarEventInput): Promise<CalendarEvent> => {
  if (!supabase) {
    throw new Error('Supabase env vars missing; creating calendar events requires a live backend.');
  }

  const { reminders = [], ...eventInput } = input;

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      org_id: eventInput.org_id,
      title: eventInput.title,
      start_at: eventInput.start_at,
      end_at: eventInput.end_at,
      type: eventInput.type,
      status: eventInput.status ?? 'scheduled',
      location: eventInput.location ?? null,
      link_type: eventInput.link_type ?? 'none',
      link_id: eventInput.link_id ?? null,
      visibility: eventInput.visibility ?? 'org',
      meta: eventInput.meta ?? {},
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to create calendar event'));
  }
  if (!data) {
    throw new Error('Calendar event creation returned no data.');
  }

  if (reminders.length > 0) {
    const rows = reminders.map((reminder) => ({
      org_id: eventInput.org_id,
      event_id: data.id,
      type: reminder.type ?? 'local',
      offset_minutes: reminder.offset_minutes ?? 60,
      deterministic_key:
        reminder.deterministic_key ?? `${eventInput.type}_${data.id}_${reminder.offset_minutes ?? 60}`,
      payload: reminder.payload ?? {},
    }));

    const { error: reminderError } = await supabase
      .from('calendar_reminders')
      .upsert(rows, { onConflict: 'org_id,deterministic_key' });

    if (reminderError) {
      throw new Error(formatSupabaseError(reminderError, 'Failed to create calendar reminders'));
    }
  }

  const events = await fetchCalendarEvents({
    orgId: eventInput.org_id,
    startDate: eventInput.start_at,
    endDate: eventInput.end_at,
    fallbackToMockOnError: false,
    requireLive: true,
  });

  const created = events.find((evt) => evt.source_id === data.id || evt.event_id === `cal_${data.id}`);
  return created ?? normalizeEvent({ ...data, event_id: `cal_${data.id}`, source_type: eventInput.type, reminders });
};

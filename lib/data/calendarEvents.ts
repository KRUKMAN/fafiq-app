import dayjs from 'dayjs';

import { getMockCalendarEvents } from '@/lib/mocks/calendarEvents';
import { supabase } from '@/lib/supabase';
import { CalendarEvent, CalendarReminder, CalendarSourceType } from '@/schemas/calendarEvent';
import { formatSupabaseError } from './errors';
import { logger } from '@/lib/logger';

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
  linkType?: string;
  linkId?: string;
  assignedMembershipId?: string;
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

const normalizeReminder = (reminder: any): CalendarReminder | null => {
  if (!reminder || typeof reminder !== 'object') return null;
  const scheduled =
    typeof reminder.scheduled_at === 'string'
      ? reminder.scheduled_at
      : typeof reminder.scheduledAt === 'string'
        ? reminder.scheduledAt
        : null;
  if (!scheduled) return null;

  const offset =
    typeof reminder.offset_minutes === 'number'
      ? reminder.offset_minutes
      : Number(reminder.offset_minutes ?? reminder.offsetMinutes ?? 0);

  const deterministic =
    reminder.deterministic_key ??
    reminder.deterministicKey ??
    reminder.id ??
    (scheduled ? `rem_${scheduled}` : null);

  return {
    id: String(reminder.id ?? deterministic ?? ''),
    type: typeof reminder.type === 'string' ? reminder.type : 'local',
    offset_minutes: Number.isFinite(offset) ? offset : 0,
    scheduled_at: scheduled,
    deterministic_key: deterministic ? String(deterministic) : '',
    payload: typeof reminder.payload === 'object' && reminder.payload !== null ? reminder.payload : {},
  };
};

const normalizeEvent = (event: any): CalendarEvent | null => {
  if (!event || typeof event !== 'object') return null;
  const reminders = Array.isArray(event?.reminders)
    ? event.reminders
        .map((reminder: any) => {
          try {
            return normalizeReminder(reminder);
          } catch (err) {
            logger.warn('Invalid calendar reminder, skipping', { err, reminder });
            return null;
          }
        })
        .filter(Boolean)
    : [];

  const startAt = typeof event.start_at === 'string' ? event.start_at : null;
  const endAt = typeof event.end_at === 'string' ? event.end_at : null;
  if (!startAt || !endAt) return null;

  const sourceType = typeof event.source_type === 'string' ? event.source_type : event.type ?? 'general';
  const eventId = event.event_id ?? event.id;
  const orgId = event.org_id;
  if (!eventId || !orgId) return null;

  return {
    event_id: String(eventId),
    org_id: String(orgId),
    source_type: sourceType as CalendarSourceType,
    source_id: event.source_id ? String(event.source_id) : null,
    title: event.title ?? 'Event',
    start_at: startAt,
    end_at: endAt,
    location: event.location ?? null,
    status: event.status ?? null,
    link_type: event.link_type ?? 'none',
    link_id: event.link_id ?? null,
    visibility: event.visibility ?? 'org',
    meta: event.meta ?? {},
    reminders: reminders as CalendarReminder[],
  };
};

const normalizeList = (raw: any[]): CalendarEvent[] =>
  raw
    .map(normalizeEvent)
    .filter(Boolean)
    .sort((a, b) => (a?.start_at ?? '').localeCompare(b?.start_at ?? '')) as CalendarEvent[];

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
    return normalizeList(mockEvents);
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
    p_link_type: params.linkType ?? null,
    p_link_id: params.linkId ?? null,
    p_assigned_membership_id: params.assignedMembershipId ?? null,
  });

  if (!error) {
    const normalized = normalizeList(data ?? []);
    if ((data?.length ?? 0) > 0 && normalized.length === 0) {
      logger.warn('Calendar events received but none parsed successfully', {
        sample: data?.slice(0, 3),
      });
    }
    return normalized;
  }

  const message = formatSupabaseError(error, 'Failed to load calendar events');
  if (params.fallbackToMockOnError && !params.requireLive) {
    logger.warn('Failed to load calendar events; falling back to mock', { message });
    const mockEvents = await getMockCalendarEvents(params.orgId, startIso, endIso);
    return normalizeList(mockEvents);
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
      meta: (eventInput.meta ?? {}) as any,
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
      payload: (reminder.payload ?? {}) as any,
    }));

    const { error: reminderError } = await (supabase as any)
      .from('calendar_reminders')
      .upsert(rows as any, { onConflict: 'org_id,deterministic_key' });

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
  if (created) return created;

  const normalized = normalizeEvent({
    ...data,
    event_id: `cal_${data.id}`,
    source_type: eventInput.type,
    reminders,
  });
  if (!normalized) {
    throw new Error('Calendar event creation returned invalid data.');
  }
  return normalized;
};

import { z } from 'zod';

export const calendarReminderSchema = z.object({
  id: z.string(),
  type: z.enum(['local', 'push', 'email']).or(z.string()).default('local'),
  offset_minutes: z.number().default(0),
  scheduled_at: z.string(),
  deterministic_key: z.string(),
  payload: z.record(z.any()).optional().default({}),
});

export const calendarEventSchema = z.object({
  event_id: z.string(),
  org_id: z.string(),
  source_type: z
    .enum(['medical', 'transport', 'quarantine', 'general', 'system_task', 'finance', 'external', 'quarantine_artifact', 'task'])
    .or(z.string()),
  source_id: z.string().nullable(),
  title: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  location: z.string().nullable(),
  status: z.string().nullable(),
  link_type: z.enum(['dog', 'transport', 'profile', 'contact', 'none']).or(z.string()),
  link_id: z.string().nullable(),
  visibility: z.string().nullable(),
  meta: z.record(z.any()).optional().default({}),
  reminders: z.array(calendarReminderSchema).optional().default([]),
});

export type CalendarReminder = z.infer<typeof calendarReminderSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarSourceType = CalendarEvent['source_type'];

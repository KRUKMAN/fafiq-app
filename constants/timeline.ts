import type { CalendarSourceType } from '@/schemas/calendarEvent';

// Default "Important" filters for timelines.
// Keep this list small and high-signal; it drives the default Timeline tab experience.
export const IMPORTANT_AUDIT_EVENT_TYPES = [
  // Dogs
  'dog.created',
  'dog.stage_changed',
  'dog.assignment_changed',
  'dog.archived',
  'dog.restored',

  // Transports
  'transport.created',
  'transport.status_changed',
  'transport.assignee_changed',
  'transport.archived',
  'transport.restored',

  // Files
  'document.uploaded',
  'document.deleted',
  'photo.uploaded',
  'photo.deleted',
] as const;

export const IMPORTANT_SCHEDULE_SOURCE_TYPES: CalendarSourceType[] = [
  'task',
  'general',
  'transport',
  'medical',
  'quarantine',
];

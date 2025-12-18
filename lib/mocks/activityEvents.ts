import { activityEventSchema, ActivityEvent } from '@/schemas/activityEvent';

const activityEventsList: ActivityEvent[] = [
  activityEventSchema.parse({
    id: 'evt_1',
    org_id: 'org_123',
    created_at: '2025-12-17T15:30:00Z',
    actor_user_id: 'user_123',
    actor_membership_id: 'm_org123_user123',
    entity_type: 'dog',
    entity_id: '1',
    event_type: 'dog.status_changed',
    summary: 'Status changed to In Foster',
    payload: { from: 'Intake', to: 'In Foster' },
    related: { responsible_person: 'Maria Garcia' },
  }),
  activityEventSchema.parse({
    id: 'evt_2',
    org_id: 'org_123',
    created_at: '2025-12-17T16:10:00Z',
    actor_user_id: 'user_123',
    actor_membership_id: 'm_org123_user123',
    entity_type: 'dog',
    entity_id: '1',
    event_type: 'dog.note_added',
    summary: 'Added note about diet and medication schedule',
    payload: { note: 'Twice-daily meds with food.' },
    related: {},
  }),
  activityEventSchema.parse({
    id: 'evt_3',
    org_id: 'org_123',
    created_at: '2025-12-17T18:45:00Z',
    actor_user_id: 'user_456',
    actor_membership_id: 'm_org123_user123',
    entity_type: 'dog',
    entity_id: '2',
    event_type: 'dog.medical_update',
    summary: 'Post-surgery recovery check',
    payload: { status: 'Stable', follow_up: '2 days' },
    related: {},
  }),
  activityEventSchema.parse({
    id: 'evt_4',
    org_id: 'org_123',
    created_at: '2025-12-18T08:15:00Z',
    actor_user_id: 'user_123',
    actor_membership_id: 'm_org123_user123',
    entity_type: 'transport',
    entity_id: 'tr_1',
    event_type: 'transport.scheduled',
    summary: 'Transport scheduled for Rocky',
    payload: { dog_id: '3', window_start: '2025-12-18T09:00:00Z' },
    related: {},
  }),
];

export const getMockActivityEventsByEntity = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<ActivityEvent[]> =>
  activityEventsList
    .filter((event) => event.org_id === orgId && event.entity_type === entityType && event.entity_id === entityId)
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

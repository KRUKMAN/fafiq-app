import { transportSchema, Transport } from '@/schemas/transport';

const transportsList: Transport[] = [
  transportSchema.parse({
    id: 'tr_1',
    org_id: 'org_123',
    dog_id: '3',
    from_location: 'Shelter HQ',
    to_location: 'Foster: Greenfield',
    status: 'Scheduled',
    assigned_membership_id: 'm_org123_user123',
    window_start: '2025-12-18T09:00:00Z',
    window_end: '2025-12-18T12:00:00Z',
    notes: 'Pickup at 9AM, drop-off before noon.',
    extra_fields: {},
  }),
  transportSchema.parse({
    id: 'tr_2',
    org_id: 'org_123',
    dog_id: '2',
    from_location: 'Vet Clinic XYZ',
    to_location: 'Foster: Downtown',
    status: 'In Progress',
    assigned_membership_id: 'm_org123_user123',
    window_start: '2025-12-17T14:00:00Z',
    window_end: '2025-12-17T16:00:00Z',
    notes: 'Post-surgery transfer with meds.',
    extra_fields: {},
  }),
  transportSchema.parse({
    id: 'tr_3',
    org_id: 'org_456',
    dog_id: null,
    from_location: 'Shelter North',
    to_location: 'Vet: Happy Paws',
    status: 'Requested',
    assigned_membership_id: null,
    window_start: null,
    window_end: null,
    notes: 'Awaiting assignment',
    extra_fields: {},
  }),
];

export const getMockTransports = async (orgId: string): Promise<Transport[]> =>
  transportsList.filter((t) => t.org_id === orgId);

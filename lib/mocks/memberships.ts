import { membershipSchema, Membership } from '@/schemas/membership';

const membershipsList: Membership[] = [
  membershipSchema.parse({
    id: 'm_org123_user123',
    org_id: 'org_123',
    user_id: 'user_123',
    roles: ['admin'],
    active: true,
  }),
  membershipSchema.parse({
    id: 'm_org456_user123',
    org_id: 'org_456',
    user_id: 'user_123',
    roles: ['volunteer'],
    active: true,
  }),
];

export const getMockMemberships = async (): Promise<Membership[]> => membershipsList;

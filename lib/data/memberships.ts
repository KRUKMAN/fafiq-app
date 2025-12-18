import { membershipSchema, Membership } from '@/schemas/membership';
import { getMockMemberships } from '@/lib/mocks/memberships';

export const fetchMemberships = async (): Promise<Membership[]> => {
  const memberships = await getMockMemberships();
  return memberships.map((m) => membershipSchema.parse(m));
};

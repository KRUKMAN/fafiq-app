import { orgSchema, Org } from '@/schemas/org';
import { getMockOrgs } from '@/lib/mocks/orgs';

export const fetchOrgs = async (): Promise<Org[]> => {
  const orgs = await getMockOrgs();
  return orgs.map((org) => orgSchema.parse(org));
};

import { orgSchema, Org } from '@/schemas/org';

const orgsList: Org[] = [
  orgSchema.parse({
    id: 'org_123',
    name: 'Stray Love Found NGO',
    slug: 'stray-love-found',
    settings: {
      dog_stages: ['Intake', 'In Foster', 'Medical', 'Transport', 'Adopted'],
      transport_statuses: ['Requested', 'Scheduled', 'In Progress', 'Done', 'Canceled'],
    },
  }),
  orgSchema.parse({
    id: 'org_456',
    name: 'Paws & Claws',
    slug: 'paws-and-claws',
    settings: {
      dog_stages: ['Intake', 'Medical', 'In Foster', 'Adopted'],
      transport_statuses: ['Requested', 'Scheduled', 'Done'],
    },
  }),
];

export const getMockOrgs = async (): Promise<Org[]> => orgsList;

import { Dog, dogSchema } from '@/schemas/dog';

const mockDogsList: Dog[] = [
  dogSchema.parse({
    id: '1',
    org_id: 'org_123',
    name: 'Buddy',
    status: 'In Foster',
    medical_status: 'Needs vaccination',
    location: 'Vet: Clinic XYZ',
    description:
      'Energetic, friendly with people, gets along with other dogs. Does not like cats. Very food motivated and responds well to positive reinforcement.',
    extra_fields: {
      internal_id: 'DOG-1234',
      photo_url:
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
      responsible_person: 'Maria Garcia',
      foster_name: 'Sarah Johnson',
      budget_spent: 1500,
      last_update: 'Today, 10:45 AM',
      last_update_iso: '2025-12-17T10:45:00Z',
      attributes: {
        age: '2 years',
        sex: 'Male',
        size: 'Medium',
        breed: 'Labrador Mix',
        intake_date: 'Oct 15, 2023',
      },
      alerts: [
        { type: 'error', message: 'No foster assigned' },
        { type: 'warning', message: 'Vaccination overdue' },
      ],
    },
  }),
  dogSchema.parse({
    id: '2',
    org_id: 'org_123',
    name: 'Luna',
    status: 'Medical',
    medical_status: 'Post-surgery recovery',
    location: 'Foster: Greenfield',
    description:
      'Calm, shy initially but warms up. On medication for recovery, needs quiet environment.',
      extra_fields: {
        internal_id: 'DOG-2234',
        photo_url:
          'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80',
        responsible_person: 'Daniel Lee',
        foster_name: 'Alex Morgan',
        budget_spent: 2100,
        last_update: 'Today, 09:15 AM',
        last_update_iso: '2025-12-17T09:15:00Z',
        attributes: {
          age: '3 years',
          sex: 'Female',
          size: 'Small',
        breed: 'Terrier Mix',
        intake_date: 'Nov 02, 2023',
      },
      alerts: [{ type: 'warning', message: 'Medical follow-up in 2 days' }],
    },
  }),
  dogSchema.parse({
    id: '3',
    org_id: 'org_123',
    name: 'Rocky',
    status: 'Transport',
    medical_status: 'Healthy',
    location: 'Shelter HQ',
    description: 'High energy, loves fetch. Ready for transport to foster tomorrow.',
      extra_fields: {
        internal_id: 'DOG-3234',
        photo_url:
          'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80',
        responsible_person: 'Maria Garcia',
        foster_name: null,
        budget_spent: 950,
        last_update: 'Yesterday, 4:30 PM',
        last_update_iso: '2025-12-16T16:30:00Z',
        attributes: {
          age: '1 year',
          sex: 'Male',
        size: 'Medium',
        breed: 'Shepherd Mix',
        intake_date: 'Dec 01, 2023',
      },
      alerts: [{ type: 'warning', message: 'Transport scheduled' }],
    },
  }),
];

const mockDogsByKey: Record<string, Dog> = Object.fromEntries(
  mockDogsList.map((dog) => [`${dog.org_id}:${dog.id}`, dog])
);

export const getMockDogById = async (orgId: string, dogId: string): Promise<Dog> => {
  const key = `${orgId}:${dogId}`;
  const dog = mockDogsByKey[key];

  if (!dog) {
    throw new Error('Dog not found in mock data');
  }

  return dog;
};

export const getMockDogs = async (orgId: string): Promise<Dog[]> => {
  // Filter by org_id to mimic multi-tenant behavior.
  return mockDogsList.filter((dog) => dog.org_id === orgId);
};

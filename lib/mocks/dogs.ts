import { Dog, dogSchema } from '@/schemas/dog';

const mockDog = dogSchema.parse({
  id: '1',
  tenant_id: 'tenant_123',
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
});

const mockDogs: Record<string, Dog> = {
  [`${mockDog.tenant_id}:${mockDog.id}`]: mockDog,
};

export const getMockDogById = async (tenantId: string, dogId: string): Promise<Dog> => {
  const key = `${tenantId}:${dogId}`;
  const dog = mockDogs[key];

  if (!dog) {
    throw new Error('Dog not found in mock data');
  }

  return dog;
};

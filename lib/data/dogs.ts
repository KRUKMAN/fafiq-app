import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById } from '@/lib/mocks/dogs';

// Placeholder for Supabase-backed fetches; currently returns validated mock data.
export const fetchDogById = async (tenantId: string, dogId: string): Promise<Dog> => {
  const dog = await getMockDogById(tenantId, dogId);
  return dogSchema.parse(dog);
};

import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById } from '@/lib/mocks/dogs';

// Placeholder for Supabase-backed fetches; currently returns validated mock data.
export const fetchDogById = async (orgId: string, dogId: string): Promise<Dog> => {
  const dog = await getMockDogById(orgId, dogId);
  return dogSchema.parse(dog);
};

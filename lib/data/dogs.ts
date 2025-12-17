import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById, getMockDogs } from '@/lib/mocks/dogs';

type DogFilters = {
  status?: string;
  search?: string;
};

// Placeholder for Supabase-backed fetches; currently returns validated mock data.
export const fetchDogById = async (orgId: string, dogId: string): Promise<Dog> => {
  const dog = await getMockDogById(orgId, dogId);
  return dogSchema.parse(dog);
};

export const fetchDogs = async (orgId: string, filters?: DogFilters): Promise<Dog[]> => {
  const dogs = await getMockDogs(orgId);
  const search = filters?.search?.toLowerCase().trim();
  const status = filters?.status?.toLowerCase().trim();

  const filtered = dogs.filter((dog) => {
    const matchesStatus = status ? dog.status.toLowerCase() === status : true;
    const matchesSearch = search
      ? dog.name.toLowerCase().includes(search) ||
        dog.extra_fields.internal_id?.toLowerCase().includes(search ?? '') ||
        dog.description.toLowerCase().includes(search)
      : true;
    return matchesStatus && matchesSearch;
  });

  return filtered.map((dog) => dogSchema.parse(dog));
};

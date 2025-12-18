import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById, getMockDogs } from '@/lib/mocks/dogs';

type DogFilters = {
  stage?: string;
  search?: string;
  location?: string;
  responsible?: string;
  hasAlerts?: boolean;
  updatedAfter?: string;
  updatedBefore?: string;
};

// Placeholder for Supabase-backed fetches; currently returns validated mock data.
export const fetchDogById = async (orgId: string, dogId: string): Promise<Dog> => {
  const dog = await getMockDogById(orgId, dogId);
  return dogSchema.parse(dog);
};

export const fetchDogs = async (orgId: string, filters?: DogFilters): Promise<Dog[]> => {
  const dogs = await getMockDogs(orgId);
  const search = filters?.search?.toLowerCase().trim();
  const stage = filters?.stage?.toLowerCase().trim();
  const location = filters?.location?.toLowerCase().trim();
  const responsible = filters?.responsible?.toLowerCase().trim();
  const hasAlerts = filters?.hasAlerts;
  const updatedAfter = filters?.updatedAfter ? Date.parse(filters.updatedAfter) : null;
  const updatedBefore = filters?.updatedBefore ? Date.parse(filters.updatedBefore) : null;

  const filtered = dogs.filter((dog) => {
    const matchesStage = stage ? dog.stage.toLowerCase() === stage : true;
    const matchesSearch = search
      ? dog.name.toLowerCase().includes(search) ||
        dog.extra_fields.internal_id?.toLowerCase().includes(search ?? '') ||
        dog.description.toLowerCase().includes(search)
      : true;
    const matchesLocation = location ? dog.location.toLowerCase().includes(location) : true;
    const matchesResponsible = responsible
      ? (dog.extra_fields.responsible_person ?? '').toLowerCase().includes(responsible)
      : true;
    const alertCount = dog.extra_fields.alerts?.length ?? 0;
    const matchesAlerts = hasAlerts ? alertCount > 0 : true;
    const lastUpdateIso = dog.extra_fields.last_update_iso;
    const lastUpdateTime = lastUpdateIso ? Date.parse(lastUpdateIso) : null;
    const matchesAfter =
      updatedAfter && lastUpdateTime ? lastUpdateTime >= updatedAfter : !updatedAfter || lastUpdateTime !== null;
    const matchesBefore =
      updatedBefore && lastUpdateTime ? lastUpdateTime <= updatedBefore : !updatedBefore || lastUpdateTime !== null;
    return (
      matchesStage &&
      matchesSearch &&
      matchesLocation &&
      matchesResponsible &&
      matchesAlerts &&
      matchesAfter &&
      matchesBefore
    );
  });

  return filtered.map((dog) => dogSchema.parse(dog));
};

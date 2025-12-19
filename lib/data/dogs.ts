import { supabase } from '@/lib/supabase';
import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById, getMockDogs } from '@/lib/mocks/dogs';
import { formatSupabaseError } from '@/lib/data/errors';

type DogFilters = {
  stage?: string;
  search?: string;
  location?: string;
  responsible?: string;
  hasAlerts?: boolean;
  updatedAfter?: string;
  updatedBefore?: string;
};

const filterDogs = (dogs: Dog[], filters?: DogFilters) => {
  const search = filters?.search?.toLowerCase().trim();
  const stage = filters?.stage?.toLowerCase().trim();
  const location = filters?.location?.toLowerCase().trim();
  const responsible = filters?.responsible?.toLowerCase().trim();
  const hasAlerts = filters?.hasAlerts;
  const updatedAfter = filters?.updatedAfter ? Date.parse(filters.updatedAfter) : null;
  const updatedBefore = filters?.updatedBefore ? Date.parse(filters.updatedBefore) : null;

  return dogs.filter((dog) => {
    const matchesStage = stage ? dog.stage.toLowerCase() === stage : true;
    const matchesSearch = search
      ? dog.name.toLowerCase().includes(search) ||
        (dog.extra_fields.internal_id ?? '').toLowerCase().includes(search) ||
        dog.description.toLowerCase().includes(search)
      : true;
    const matchesLocation = location ? dog.location.toLowerCase().includes(location) : true;
    const matchesResponsible = responsible
      ? (dog.extra_fields.responsible_person ?? '').toLowerCase().includes(responsible)
      : true;
    const alertCount = (dog.extra_fields.alerts as unknown[] | undefined)?.length ?? 0;
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
};

// Placeholder for Supabase-backed fetches; currently returns validated mock data.
export const fetchDogById = async (orgId: string, dogId: string): Promise<Dog> => {
  if (!supabase) {
    const dog = await getMockDogById(orgId, dogId);
    return dogSchema.parse(dog);
  }

  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', dogId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch dog'));
  }
  if (!data) {
    throw new Error('Dog not found');
  }

  const normalized = {
    ...data,
    location: data.location ?? '',
    description: data.description ?? '',
    medical_notes: data.medical_notes ?? '',
    behavioral_notes: data.behavioral_notes ?? '',
    extra_fields: data.extra_fields ?? {},
  };

  return dogSchema.parse(normalized);
};

export const fetchDogs = async (orgId: string, filters?: DogFilters): Promise<Dog[]> => {
  if (!supabase) {
    const dogs = await getMockDogs(orgId);
    return filterDogs(dogs.map((dog) => dogSchema.parse(dog)), filters);
  }

  let query = supabase.from('dogs').select('*').eq('org_id', orgId);

  if (filters?.stage) {
    query = query.eq('stage', filters.stage);
  }

  const { data, error } = await query.order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch dogs'));
  }

  const parsed = (data ?? []).map((dog) =>
    dogSchema.parse({
      ...dog,
      location: dog.location ?? '',
      description: dog.description ?? '',
      medical_notes: dog.medical_notes ?? '',
      behavioral_notes: dog.behavioral_notes ?? '',
      extra_fields: dog.extra_fields ?? {},
    })
  );

  return filterDogs(parsed, filters);
};

export const softDeleteDog = async (orgId: string, dogId: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; dog deletion requires Supabase env.');
  }

  const { error } = await supabase
    .from('dogs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dogId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to delete dog'));
  }
};

export const restoreDog = async (orgId: string, dogId: string): Promise<Dog> => {
  if (!supabase) {
    throw new Error('Supabase not configured; dog restoration requires Supabase env.');
  }

  const { data, error } = await supabase
    .from('dogs')
    .update({ deleted_at: null })
    .eq('id', dogId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to restore dog'));
  }
  if (!data) {
    throw new Error('Dog not found or restoration failed.');
  }

  return dogSchema.parse({
    ...data,
    location: data.location ?? '',
    description: data.description ?? '',
    medical_notes: data.medical_notes ?? '',
    behavioral_notes: data.behavioral_notes ?? '',
    extra_fields: data.extra_fields ?? {},
  });
};

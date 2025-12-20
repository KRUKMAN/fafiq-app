import { supabase } from '@/lib/supabase';
import { Dog, dogSchema } from '@/schemas/dog';
import { getMockDogById, getMockDogs } from '@/lib/mocks/dogs';
import { formatSupabaseError } from '@/lib/data/errors';

type NewDogInput = {
  org_id: string;
  name: string;
  stage: string;
  location: string;
  description: string;
  medical_notes?: string | null;
  behavioral_notes?: string | null;
  extra_fields?: Record<string, unknown> | null;
};

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

  // Enrich list rows with a signed dog photo URL from dog_photos (private bucket).
  // This keeps list components relying on extra_fields.photo_url working without schema changes.
  try {
    const dogIds = parsed.map((d) => d.id).filter(Boolean);
    if (dogIds.length > 0) {
      const { data: photoRows, error: photosError } = await supabase
        .from('dog_photos')
        .select('dog_id, storage_path, is_primary, created_at')
        .eq('org_id', orgId)
        .in('dog_id', dogIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false, nullsFirst: false });

      if (!photosError && photoRows?.length) {
        const dogIdToPath = new Map<string, string>();
        for (const row of photoRows) {
          if (!dogIdToPath.has(row.dog_id) && row.storage_path) {
            dogIdToPath.set(row.dog_id, row.storage_path);
          }
        }

        const uniquePaths = Array.from(new Set(Array.from(dogIdToPath.values())));
        const { data: signed, error: signedError } = await supabase.storage
          .from('dog-photos')
          .createSignedUrls(uniquePaths, 60 * 30);

        if (!signedError && signed?.length) {
          const pathToSigned = new Map<string, string>();
          for (const item of signed) {
            if (item?.path && item?.signedUrl) pathToSigned.set(item.path, item.signedUrl);
          }

          const enriched = parsed.map((dog) => {
            const path = dogIdToPath.get(dog.id);
            const signedUrl = path ? pathToSigned.get(path) : undefined;
            if (!signedUrl) return dog;
            return {
              ...dog,
              extra_fields: {
                ...(dog.extra_fields ?? {}),
                photo_url: signedUrl,
              },
            };
          });

          return filterDogs(enriched, filters);
        }
      }
    }
  } catch {
    // best-effort; fall back to base list
  }

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

export const createDog = async (input: NewDogInput): Promise<Dog> => {
  if (!supabase) {
    throw new Error('Supabase not configured; dog creation requires Supabase env.');
  }

  const { data, error } = await (supabase as any)
    .from('dogs')
    .insert({
      org_id: input.org_id,
      name: input.name,
      stage: input.stage,
      location: input.location,
      description: input.description,
      medical_notes: input.medical_notes ?? null,
      behavioral_notes: input.behavioral_notes ?? null,
      extra_fields: (input.extra_fields ?? {}) as any,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to create dog'));
  }
  if (!data) {
    throw new Error('Dog creation returned no data.');
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

export const updateDog = async (
  orgId: string,
  dogId: string,
  updates: Partial<
    Pick<
      Dog,
      | 'name'
      | 'stage'
      | 'location'
      | 'description'
      | 'medical_notes'
      | 'behavioral_notes'
      | 'extra_fields'
      | 'foster_contact_id'
      | 'responsible_contact_id'
      | 'foster_membership_id'
      | 'responsible_membership_id'
    >
  >
): Promise<Dog> => {
  if (!supabase) {
    throw new Error('Supabase not configured; dog update requires Supabase env.');
  }

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.medical_notes !== undefined) payload.medical_notes = updates.medical_notes;
  if (updates.behavioral_notes !== undefined) payload.behavioral_notes = updates.behavioral_notes;
  if (updates.foster_contact_id !== undefined) payload.foster_contact_id = updates.foster_contact_id ?? null;
  if (updates.responsible_contact_id !== undefined) payload.responsible_contact_id = updates.responsible_contact_id ?? null;
  if (updates.foster_membership_id !== undefined) payload.foster_membership_id = updates.foster_membership_id ?? null;
  if (updates.responsible_membership_id !== undefined)
    payload.responsible_membership_id = updates.responsible_membership_id ?? null;
  if (updates.extra_fields !== undefined) payload.extra_fields = updates.extra_fields ?? {};

  if (Object.keys(payload).length === 0) {
    throw new Error('No updates provided for dog.');
  }

  const { data, error } = await supabase
    .from('dogs')
    .update(payload)
    .eq('id', dogId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to update dog'));
  }
  if (!data) {
    throw new Error('Dog update returned no data.');
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

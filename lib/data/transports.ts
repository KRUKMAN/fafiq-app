import { supabase } from '@/lib/supabase';
import { transportSchema, Transport } from '@/schemas/transport';
import { getMockTransports } from '@/lib/mocks/transports';
import { formatSupabaseError } from '@/lib/data/errors';

type NewTransportInput = {
  org_id: string;
  dog_id?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  status: string;
  assigned_membership_id?: string | null;
  assigned_contact_id?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  notes?: string | null;
  extra_fields?: Record<string, unknown>;
};

export const fetchTransports = async (orgId: string): Promise<Transport[]> => {
  const client = supabase;
  if (!client) {
    const transports = await getMockTransports(orgId);
    return transports.map((t) => transportSchema.parse(t));
  }

  const { data, error } = await client
    .from('transports')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch transports'));
  }

  return (data ?? []).map((t) =>
    transportSchema.parse({
      ...t,
      from_location: t.from_location ?? '',
      to_location: t.to_location ?? '',
      notes: t.notes ?? '',
      extra_fields: t.extra_fields ?? {},
    })
  );
};

export const createTransport = async (input: NewTransportInput): Promise<Transport> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; transport creation requires Supabase env.');
  }

  const { data, error } = await client
    .from('transports')
    .insert({
      org_id: input.org_id,
      dog_id: input.dog_id ?? null,
      from_location: input.from_location ?? null,
      to_location: input.to_location ?? null,
      status: input.status,
      assigned_membership_id: input.assigned_membership_id ?? null,
      assigned_contact_id: input.assigned_contact_id ?? null,
      window_start: input.window_start ?? null,
      window_end: input.window_end ?? null,
      notes: input.notes ?? null,
      extra_fields: (input.extra_fields ?? {}) as any,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to create transport'));
  }
  if (!data) {
    throw new Error('Transport creation returned no data.');
  }

  return transportSchema.parse({
    ...data,
    from_location: data.from_location ?? '',
    to_location: data.to_location ?? '',
    notes: data.notes ?? '',
    extra_fields: data.extra_fields ?? {},
  });
};

export const updateTransport = async (
  orgId: string,
  transportId: string,
  updates: Partial<Omit<NewTransportInput, 'org_id'>>
): Promise<Transport> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; transport update requires Supabase env.');
  }

  const updatePayload: Record<string, unknown> = {};
  if (updates.dog_id !== undefined) updatePayload.dog_id = updates.dog_id ?? null;
  if (updates.from_location !== undefined) updatePayload.from_location = updates.from_location ?? null;
  if (updates.to_location !== undefined) updatePayload.to_location = updates.to_location ?? null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.assigned_membership_id !== undefined)
    updatePayload.assigned_membership_id = updates.assigned_membership_id ?? null;
  if (updates.assigned_contact_id !== undefined) updatePayload.assigned_contact_id = updates.assigned_contact_id ?? null;
  if (updates.window_start !== undefined) updatePayload.window_start = updates.window_start ?? null;
  if (updates.window_end !== undefined) updatePayload.window_end = updates.window_end ?? null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes ?? null;
  if (updates.extra_fields !== undefined) updatePayload.extra_fields = (updates.extra_fields ?? {}) as any;

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No updates provided for transport.');
  }

  const { data, error } = await client
    .from('transports')
    .update(updatePayload)
    .eq('id', transportId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to update transport'));
  }
  if (!data) {
    throw new Error('Transport update returned no data.');
  }

  return transportSchema.parse({
    ...data,
    from_location: data.from_location ?? '',
    to_location: data.to_location ?? '',
    notes: data.notes ?? '',
    extra_fields: data.extra_fields ?? {},
  });
};

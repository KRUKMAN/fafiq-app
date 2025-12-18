import { supabase } from '@/lib/supabase';
import { transportSchema, Transport } from '@/schemas/transport';
import { getMockTransports } from '@/lib/mocks/transports';

export const fetchTransports = async (orgId: string): Promise<Transport[]> => {
  if (!supabase) {
    const transports = await getMockTransports(orgId);
    return transports.map((t) => transportSchema.parse(t));
  }

  const { data, error } = await supabase
    .from('transports')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch transports: ${error.message}`);
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

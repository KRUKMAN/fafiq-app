import { getMockOrgs } from '@/lib/mocks/orgs';
import { supabase } from '@/lib/supabase';
import { Org, orgSchema } from '@/schemas/org';

export const fetchOrgs = async (): Promise<Org[]> => {
  const orgs = await getMockOrgs();
  return orgs.map((org) => orgSchema.parse(org));
};

export const fetchOrgById = async (orgId: string): Promise<Org | null> => {
  if (!supabase) {
    const orgs = await getMockOrgs();
    const org = orgs.find((o) => o.id === orgId);
    return org ? orgSchema.parse(org) : null;
  }

  const { data, error } = await supabase.from('orgs').select('*').eq('id', orgId).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch org: ${error.message}`);
  }
  return data ? orgSchema.parse(data) : null;
};

export const updateOrgSettings = async (orgId: string, settings: Record<string, unknown>): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; org settings update requires Supabase env.');
  }

  const { error } = await supabase
    .from('orgs')
    .update({ settings: settings as any, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (error) {
    throw new Error(`Failed to update org settings: ${error.message}`);
  }
};

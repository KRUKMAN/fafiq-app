import { supabase } from '@/lib/supabase';
import { OrgContact, orgContactSchema } from '@/schemas/orgContact';
import { formatSupabaseError } from '@/lib/data/errors';

export type NewOrgContactInput = {
  org_id: string;
  kind: 'person' | 'home' | string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  roles?: string[];
  address?: Record<string, unknown>;
  extra_fields?: Record<string, unknown>;
};

export const fetchOrgContacts = async (orgId: string): Promise<OrgContact[]> => {
  const client = supabase;
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('org_contacts')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    const missing = error.code === 'PGRST204' || msg.includes('does not exist') || msg.includes('org_contacts');
    if (missing) return [];
    throw new Error(formatSupabaseError(error, 'Failed to fetch contacts'));
  }

  return (data ?? []).map((c) =>
    orgContactSchema.parse({
      ...c,
      roles: c.roles ?? [],
      address: (c as any).address ?? {},
      extra_fields: (c as any).extra_fields ?? {},
    })
  );
};

export const createOrgContact = async (input: NewOrgContactInput): Promise<OrgContact> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; creating contacts requires Supabase env.');
  }

  const { data, error } = await client
    .from('org_contacts')
    .insert({
      org_id: input.org_id,
      kind: input.kind,
      display_name: input.display_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      roles: input.roles ?? [],
      address: (input.address ?? {}) as any,
      extra_fields: (input.extra_fields ?? {}) as any,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to create contact'));
  }
  if (!data) {
    throw new Error('Contact creation returned no data.');
  }

  return orgContactSchema.parse({
    ...data,
    roles: data.roles ?? [],
    address: (data as any).address ?? {},
    extra_fields: (data as any).extra_fields ?? {},
  });
};

export const updateOrgContact = async (orgId: string, contactId: string, updates: Partial<NewOrgContactInput>) => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; updating contacts requires Supabase env.');
  }

  const payload: Record<string, unknown> = {};
  if (updates.kind !== undefined) payload.kind = updates.kind;
  if (updates.display_name !== undefined) payload.display_name = updates.display_name;
  if (updates.email !== undefined) payload.email = updates.email ?? null;
  if (updates.phone !== undefined) payload.phone = updates.phone ?? null;
  if (updates.roles !== undefined) payload.roles = updates.roles ?? [];
  if (updates.address !== undefined) payload.address = (updates.address ?? {}) as any;
  if (updates.extra_fields !== undefined) payload.extra_fields = (updates.extra_fields ?? {}) as any;

  const { data, error } = await client
    .from('org_contacts')
    .update(payload)
    .eq('id', contactId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to update contact'));
  }
  if (!data) {
    throw new Error('Contact update returned no data.');
  }

  return orgContactSchema.parse({
    ...data,
    roles: data.roles ?? [],
    address: (data as any).address ?? {},
    extra_fields: (data as any).extra_fields ?? {},
  });
};

export const deleteOrgContact = async (orgId: string, contactId: string): Promise<void> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; deleting contacts requires Supabase env.');
  }

  const { error } = await client.from('org_contacts').delete().eq('id', contactId).eq('org_id', orgId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to delete contact'));
  }
};

export const softDeleteOrgContact = async (orgId: string, contactId: string): Promise<void> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; contact deletion requires Supabase env.');
  }

  const { error } = await client
    .from('org_contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to delete contact'));
  }
};

export const restoreOrgContact = async (orgId: string, contactId: string): Promise<OrgContact> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; contact restoration requires Supabase env.');
  }

  const { data, error } = await client
    .from('org_contacts')
    .update({ deleted_at: null })
    .eq('id', contactId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to restore contact'));
  }
  if (!data) {
    throw new Error('Contact not found or restoration failed.');
  }

  return orgContactSchema.parse({
    ...data,
    roles: data.roles ?? [],
    address: (data as any).address ?? {},
    extra_fields: (data as any).extra_fields ?? {},
  });
};

export const linkMyContactInOrg = async (orgId: string): Promise<{ contact_id: string | null; status: string }[]> => {
  const client = supabase;
  if (!client) return [];
  const { data, error } = await client.rpc('link_my_contact_in_org', { p_org_id: orgId });
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    const missing = error.code === 'PGRST204' || msg.includes('does not exist');
    if (missing) return [];
    throw new Error(formatSupabaseError(error, 'Failed to link contact'));
  }
  return (data as any) ?? [];
};

export const adminLinkContactToUser = async (
  orgId: string,
  contactId: string,
  userId: string
): Promise<{ contact_id: string; membership_id: string }[]> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; linking contacts requires Supabase env.');
  }
  const { data, error } = await client.rpc('admin_link_contact_to_user', {
    p_org_id: orgId,
    p_contact_id: contactId,
    p_user_id: userId,
  });
  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to link contact'));
  }
  return (data as any) ?? [];
};

import { supabase } from '@/lib/supabase';

type InviteResponse = {
  status: string | null;
  membership_id: string | null;
  invite_id: string | null;
  user_id: string | null;
  email: string | null;
};

export const inviteOrgMember = async (
  orgId: string,
  email: string,
  roles: string[],
  fullName?: string
): Promise<InviteResponse> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; invites require Supabase env.');
  }

  const { data, error } = await client.rpc('admin_invite_member_by_email', {
    p_org_id: orgId,
    p_email: email,
    p_roles: roles,
    p_full_name: fullName ?? undefined,
  });

  if (error) {
    throw new Error(`Invite failed: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error('Invite failed: no response from server.');
  }

  return row;
};

export type OrgInvite = {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  status: string;
  invited_by_membership_id: string | null;
  accepted_user_id: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const fetchOrgInvites = async (orgId: string): Promise<OrgInvite[]> => {
  const client = supabase;
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('org_invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invites: ${error.message}`);
  }

  return data ?? [];
};

export const acceptInvitesForCurrentUser = async (): Promise<void> => {
  const client = supabase;
  if (!client) return;
  await client.rpc('accept_org_invites_for_current_user');
};

export const cancelOrgInvite = async (orgId: string, inviteId: string): Promise<void> => {
  const client = supabase;
  if (!client) {
    throw new Error('Supabase not configured; invite management requires Supabase env.');
  }

  const { error } = await client
    .from('org_invites')
    .delete()
    .eq('id', inviteId)
    .eq('org_id', orgId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to cancel invite: ${error.message}`);
  }
};

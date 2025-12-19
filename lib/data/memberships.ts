import { supabase } from '@/lib/supabase';
import { getMockMemberships } from '@/lib/mocks/memberships';
import { getMockOrgs } from '@/lib/mocks/orgs';
import { getMockProfiles } from '@/lib/mocks/profiles';

type AdminOrgMembershipRow = {
  membership_id: string;
  org_id: string;
  user_id: string;
  roles: string[] | null;
  active: boolean;
  full_name: string | null;
  email: string | null;
  org_name: string | null;
};

type MembershipRow = {
  id: string;
  org_id: string;
  org_name: string;
  roles: string[];
  active: boolean;
  user_id: string;
  user_name: string;
  user_email?: string | null;
};

export const fetchOrgMemberships = async (orgId: string): Promise<MembershipRow[]> => {
  const client = supabase;
  if (!client) {
    const [memberships, orgs, profiles] = await Promise.all([getMockMemberships(), getMockOrgs(), getMockProfiles()]);
    return memberships
      .filter((m) => m.org_id === orgId)
      .map((m) => {
        const profile = profiles.find((p) => p.user_id === m.user_id);
        const org = orgs.find((o) => o.id === orgId);
        return {
          id: m.id,
          org_id: m.org_id,
          org_name: org?.name ?? 'Org',
          roles: m.roles ?? [],
          active: m.active,
          user_id: m.user_id,
          user_name: profile?.full_name ?? 'Member',
          user_email: profile?.full_name ? `${profile.full_name.toLowerCase().replace(/\s+/g, '.')}@example.com` : null,
        };
      });
  }

  const fetchWithoutEmails = async (): Promise<MembershipRow[]> => {
    const { data, error } = await client
      .from('memberships')
      .select('id, org_id, roles, active, user_id, orgs(name)')
      .eq('org_id', orgId);

    if (error) {
      throw new Error(`Failed to fetch memberships: ${error.message}`);
    }

    const membershipRows = data ?? [];
    const userIds = membershipRows.map((m) => m.user_id).filter(Boolean);

    let profileMap: Record<string, { full_name?: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await client
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        throw new Error(`Failed to fetch member profiles: ${profilesError.message}`);
      }

      profileMap =
        profilesData?.reduce<Record<string, { full_name?: string | null }>>((acc, p) => {
          acc[p.user_id] = { full_name: p.full_name };
          return acc;
        }, {}) ?? {};
    }

    return membershipRows.map((m) => ({
      id: m.id,
      org_id: m.org_id,
      org_name: (m.orgs as { name?: string } | null)?.name ?? 'Org',
      roles: m.roles ?? [],
      active: m.active,
      user_id: m.user_id,
      user_name: profileMap[m.user_id]?.full_name ?? 'Member',
      user_email: null,
    }));
  };

  const { data: contacts, error: contactsError } = await client.rpc('admin_list_org_memberships', { p_org_id: orgId });

  if (contactsError) {
    const isAuthScopedError =
      contactsError.code === '42501' ||
      contactsError.code === 'PGRST204' ||
      contactsError.message?.toLowerCase().includes('not exist');
    if (isAuthScopedError) {
      return fetchWithoutEmails();
    }
    throw new Error(`Failed to fetch memberships: ${contactsError.message}`);
  }

  const rows = (contacts ?? []) as unknown as AdminOrgMembershipRow[];

  return rows.map((m) => ({
    id: m.membership_id,
    org_id: m.org_id,
    org_name: m.org_name ?? 'Org',
    roles: m.roles ?? [],
    active: m.active,
    user_id: m.user_id,
    user_name: m.full_name ?? 'Member',
    user_email: m.email ?? null,
  }));
};

export const addOrgMembership = async (orgId: string, userId: string, roles: string[]): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; membership insert requires Supabase env.');
  }

  const { error } = await supabase
    .from('memberships')
    .upsert({ org_id: orgId, user_id: userId, roles, active: true }, { onConflict: 'org_id,user_id' });

  if (error) {
    throw new Error(`Failed to add membership: ${error.message}`);
  }
};

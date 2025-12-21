import { create } from 'zustand';

import { getMockMemberships } from '@/lib/mocks/memberships';
import { getMockOrgs } from '@/lib/mocks/orgs';
import { getMockProfiles } from '@/lib/mocks/profiles';
import { supabase } from '@/lib/supabase';
import { getQueryClient } from '@/lib/queryClient';
import { acceptInvitesForCurrentUser } from '@/lib/data/invites';
import { linkMyContactInOrg } from '@/lib/data/contacts';
import { logger } from '@/lib/logger';
import { setSentryUser, setSentryContext } from '@/lib/sentry';

type User = {
  id: string;
  name: string;
  email: string;
};

type Membership = {
  id: string;
  org_id: string;
  org_name: string;
  roles: string[];
  active: boolean;
};

type SessionState = {
  ready: boolean;
  isAuthenticated: boolean;
  currentUser: User | null;
  memberships: Membership[];
  activeOrgId: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
  switchOrg: (orgId: string) => void;
};

type StoreSetter = (partial: Partial<SessionState> | ((state: SessionState) => Partial<SessionState>)) => void;

let lastOrgIdMemory: string | null = null;

const mockUser: User = {
  id: 'user_123',
  name: 'Alex Demo',
  email: 'alex@example.com',
};

const selectActiveOrgId = (memberships: Membership[], lastOrgId: string | null) => {
  if (lastOrgId && memberships.some((m) => m.org_id === lastOrgId && m.active)) {
    return lastOrgId;
  }
  const firstActive = memberships.find((m) => m.active);
  return firstActive ? firstActive.org_id : null;
};

const persistLastOrgId = (orgId: string | null) => {
  lastOrgIdMemory = orgId;
  try {
    if (typeof localStorage !== 'undefined') {
      if (orgId) {
        localStorage.setItem('last_org_id', orgId);
      } else {
        localStorage.removeItem('last_org_id');
      }
    }
  } catch {
    // best effort
  }
};

const loadLastOrgId = (): string | null => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('last_org_id');
    }
  } catch {
    // ignore
  }
  return lastOrgIdMemory;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ready: false,
  isAuthenticated: false,
  currentUser: null,
  memberships: [],
  activeOrgId: null,
  bootstrap: async () => {
    if (get().ready) return;

    if (supabase) {
      const bootstrapped = await bootstrapSupabaseSession(set);
      if (bootstrapped) return;
    }

    // No Supabase session/config available - remain signed out until user opts into mock/demo mode.
    set({
      ready: true,
      isAuthenticated: false,
      currentUser: null,
      memberships: [],
      activeOrgId: null,
    });
  },
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase env vars missing. Configure Supabase or use the demo data option.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }

    await bootstrapSupabaseSession(set);
  },
  signUp: async (fullName: string, email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase env vars missing. Configure Supabase or use the demo data option.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({ user_id: userId, full_name: fullName });
    }

    await bootstrapSupabaseSession(set);
  },
  signOut: () =>
    set(() => {
      persistLastOrgId(null);
      getQueryClient().clear();
      void supabase?.auth.signOut();
      // Clear Sentry user context
      setSentryUser(null);
      return {
        ready: true,
        isAuthenticated: false,
        currentUser: null,
        memberships: [],
        activeOrgId: null,
      };
    }),
  resetPassword: async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase env vars missing. Configure Supabase to reset passwords.');
    }
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Email is required to reset password.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: undefined,
    });
    if (error) {
      throw new Error(error.message);
    }
  },
  signInDemo: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await bootstrapMockSession(set);
  },
  switchOrg: (orgId: string) =>
    set((state) => {
      if (!state.isAuthenticated) return state;
      const valid = state.memberships.some((m) => m.org_id === orgId && m.active);
      if (!valid) return state;
      persistLastOrgId(orgId);
      // Update Sentry org context
      setSentryContext('org', { orgId });
      invalidateOrgScopedQueries();
      return { activeOrgId: orgId };
    }),
}));

const bootstrapMockSession = async (set: StoreSetter) => {
  // Mock-only bootstrap is used when Supabase env is absent (or explicitly falling back).
  const lastOrgId = loadLastOrgId();
  const [membershipsRaw, orgs, profiles] = await Promise.all([
    getMockMemberships(),
    getMockOrgs(),
    getMockProfiles(),
  ]);

  const memberships = membershipsRaw.map((m) => ({
    ...m,
    org_name: orgs.find((o) => o.id === m.org_id)?.name ?? 'Unknown org',
  }));
  const activeOrgId = selectActiveOrgId(memberships, lastOrgId);
  if (activeOrgId) {
    persistLastOrgId(activeOrgId);
  }

  const userProfile = profiles.find((p) => p.user_id === mockUser.id);

  set({
    ready: true,
    isAuthenticated: true,
    currentUser: userProfile
      ? { id: userProfile.user_id, name: userProfile.full_name ?? mockUser.name, email: mockUser.email }
      : mockUser,
    memberships,
    activeOrgId,
  });
};

const bootstrapSupabaseSession = async (set: StoreSetter) => {
  if (!supabase) return false;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return false;
  }

  const userId = sessionData.session.user.id;
  const currentUser: User = {
    id: userId,
    name: sessionData.session.user.email ?? 'User',
    email: sessionData.session.user.email ?? '',
  };

  // Attempt to accept any pending invites for the signed-in user before loading memberships.
  try {
    await acceptInvitesForCurrentUser();
  } catch (err: any) {
    const msg = err?.message?.toString?.() ?? '';
    const lower = msg.toLowerCase();
    const maybeMissingRpc =
      lower.includes('does not exist') && lower.includes('accept_org_invites_for_current_user');
    const maybeRls = lower.includes('rls') || err?.code === '42501';
    logger.warn('Skipping invite acceptance', {
      reason: maybeMissingRpc
        ? 'rpc_missing'
        : maybeRls
          ? 'rls'
          : 'unknown',
      hint: maybeMissingRpc
        ? 'Run supabase/migrations/20251220_invites.sql and 20251224_accept_invites_fix2.sql'
        : maybeRls
          ? 'Ensure invite policies are applied'
          : undefined,
      err,
    });
  }

  const [{ data: membershipsData, error: membershipsError }, { data: profileData, error: profileError }] =
    await Promise.all([
      supabase
        .from('memberships')
        .select('id, org_id, roles, active, orgs(name)')
        .eq('user_id', userId)
        .eq('active', true),
      supabase.from('profiles').select('user_id, full_name').eq('user_id', userId).maybeSingle(),
    ]);

  if (membershipsError || !membershipsData) {
    logger.warn('Membership fetch failed; staying signed-in without org context', { err: membershipsError });
    set({
      ready: true,
      isAuthenticated: true,
      currentUser,
      memberships: [],
      activeOrgId: null,
    });
    persistLastOrgId(null);
    invalidateOrgScopedQueries();
    return true;
  }

  const memberships: Membership[] = membershipsData.map((m) => ({
    id: m.id,
    org_id: m.org_id,
    org_name: (m.orgs as { name?: string } | null)?.name ?? 'Org',
    roles: m.roles ?? [],
    active: m.active,
  }));

  const lastOrgId = loadLastOrgId();
  const activeOrgId = selectActiveOrgId(memberships, lastOrgId);
  if (activeOrgId) {
    persistLastOrgId(activeOrgId);
  } else {
    persistLastOrgId(null);
  }

  // Best-effort: if an offline contact exists for this email/org, link it to this user now that membership exists.
  // This is safe to run repeatedly; server-side uniqueness prevents duplicates.
  try {
    for (const membership of memberships) {
      await linkMyContactInOrg(membership.org_id);
    }
  } catch (err) {
    logger.warn('Contact linking skipped', { err });
  }

  if (profileError) {
    logger.warn('Profile fetch failed; using auth user data only', { err: profileError });
  }

  const currentUserWithProfile: User = {
    ...currentUser,
    name: profileData?.full_name ?? currentUser.name,
  };

  // Set Sentry user context
  setSentryUser(currentUserWithProfile.id, currentUserWithProfile.email, currentUserWithProfile.name);
  if (activeOrgId) {
    setSentryContext('org', { orgId: activeOrgId });
  }

  set({
    ready: true,
    isAuthenticated: true,
    currentUser: currentUserWithProfile,
    memberships,
    activeOrgId,
  });

  invalidateOrgScopedQueries();
  return true;
};

const invalidateOrgScopedQueries = () => {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['dogs'] });
  client.invalidateQueries({ queryKey: ['dog'] });
  client.invalidateQueries({ queryKey: ['dog-timeline'] });
  client.invalidateQueries({ queryKey: ['transport-timeline'] });
  client.invalidateQueries({ queryKey: ['contact-timeline'] });
  client.invalidateQueries({ queryKey: ['member-activity'] });
  client.invalidateQueries({ queryKey: ['transports'] });
  client.invalidateQueries({ queryKey: ['calendar-events'] });
};

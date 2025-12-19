import { create } from 'zustand';

import { getMockMemberships } from '@/lib/mocks/memberships';
import { getMockOrgs } from '@/lib/mocks/orgs';
import { getMockProfiles } from '@/lib/mocks/profiles';
import { supabase } from '@/lib/supabase';
import { getQueryClient } from '@/lib/queryClient';
import { acceptInvitesForCurrentUser } from '@/lib/data/invites';

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
  signOut: () => void;
  switchOrg: (orgId: string) => void;
};

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
      return {
        ready: true,
        isAuthenticated: false,
        currentUser: null,
        memberships: [],
        activeOrgId: null,
      };
    }),
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
      invalidateOrgScopedQueries();
      return { activeOrgId: orgId };
    }),
}));

const bootstrapMockSession = async (
  set: Parameters<ReturnType<typeof create<SessionState>>['setState']>[0]
) => {
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

const bootstrapSupabaseSession = async (
  set: Parameters<ReturnType<typeof create<SessionState>>['setState']>[0]
) => {
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
  } catch (err) {
    console.warn('Skipping invite acceptance (RPC missing?)', err);
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
    console.warn('Membership fetch failed; staying signed-in without org context', membershipsError);
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

  if (profileError) {
    console.warn('Profile fetch failed; using auth user data only', profileError);
  }

  const currentUserWithProfile: User = {
    ...currentUser,
    name: profileData?.full_name ?? currentUser.name,
  };

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
  client.invalidateQueries({ queryKey: ['transports'] });
};

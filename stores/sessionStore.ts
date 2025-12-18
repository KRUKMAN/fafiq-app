import { create } from 'zustand';

import { getMockMemberships } from '@/lib/mocks/memberships';
import { getMockOrgs } from '@/lib/mocks/orgs';
import { getMockProfiles } from '@/lib/mocks/profiles';
import { supabase } from '@/lib/supabase';
import { getQueryClient } from '@/lib/queryClient';

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
  signIn: () => Promise<void>;
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

    const supabaseBootstrapped = await bootstrapSupabaseSession(set);
    if (supabaseBootstrapped) {
      return;
    }

    await bootstrapMockSession(set);
  },
  signIn: async () => {
    await bootstrapMockSession(set);
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
  const [{ data: membershipsData, error: membershipsError }, { data: profileData }] = await Promise.all([
    supabase
      .from('memberships')
      .select('id, org_id, roles, active, orgs(name)')
      .eq('user_id', userId)
      .eq('active', true),
    supabase.from('profiles').select('user_id, full_name').eq('user_id', userId).maybeSingle(),
  ]);

  if (membershipsError || !membershipsData) {
    return false;
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
  }

  const currentUser: User = {
    id: userId,
    name: profileData?.full_name ?? sessionData.session.user.email ?? 'User',
    email: sessionData.session.user.email ?? '',
  };

  set({
    ready: true,
    isAuthenticated: true,
    currentUser,
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

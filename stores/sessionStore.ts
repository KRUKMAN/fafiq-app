import { create } from 'zustand';

type User = {
  id: string;
  name: string;
  email: string;
};

type Membership = {
  org_id: string;
  org_name: string;
  roles: string[];
  active: boolean;
};

type SessionState = {
  ready: boolean;
  currentUser: User | null;
  memberships: Membership[];
  activeOrgId: string | null;
  bootstrap: () => Promise<void>;
  switchOrg: (orgId: string) => void;
};

let lastOrgIdMemory: string | null = null;

const mockUser: User = {
  id: 'user_123',
  name: 'Alex Demo',
  email: 'alex@example.com',
};

const mockMemberships: Membership[] = [
  { org_id: 'org_123', org_name: 'Stray Love Found NGO', roles: ['admin'], active: true },
  { org_id: 'org_456', org_name: 'Paws & Claws', roles: ['volunteer'], active: true },
];

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

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  currentUser: null,
  memberships: [],
  activeOrgId: null,
  bootstrap: async () => {
    const lastOrgId = loadLastOrgId();
    const memberships = mockMemberships;
    const activeOrgId = selectActiveOrgId(memberships, lastOrgId);
    if (activeOrgId) {
      persistLastOrgId(activeOrgId);
    }
    set({
      ready: true,
      currentUser: mockUser,
      memberships,
      activeOrgId,
    });
  },
  switchOrg: (orgId: string) =>
    set((state) => {
      const valid = state.memberships.some((m) => m.org_id === orgId && m.active);
      if (!valid) return state;
      persistLastOrgId(orgId);
      return { activeOrgId: orgId };
    }),
}));

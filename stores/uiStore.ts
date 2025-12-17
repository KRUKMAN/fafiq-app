import { create } from 'zustand';

type Tab =
  | 'Overview'
  | 'Timeline'
  | 'Medical'
  | 'Documents'
  | 'Financial'
  | 'People & Housing'
  | 'Chat';

interface UIState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  dogList: {
    search: string;
    status: string;
    page: number;
    pageSize: number;
    advancedOpen: boolean;
  };
  setDogList: (patch: Partial<UIState['dogList']>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'Overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  dogList: {
    search: '',
    status: 'All',
    page: 1,
    pageSize: 10,
    advancedOpen: false,
  },
  setDogList: (patch) =>
    set((state) => ({
      dogList: {
        ...state.dogList,
        ...patch,
      },
    })),
}));

export const TABS: Tab[] = [
  'Overview',
  'Timeline',
  'Medical',
  'Documents',
  'Financial',
  'People & Housing',
  'Chat',
];

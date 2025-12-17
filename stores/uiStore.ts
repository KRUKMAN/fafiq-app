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
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'Overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
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

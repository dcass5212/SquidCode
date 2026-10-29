import { create } from 'zustand';
import { asNumber, asObject, readStored, writeStored } from '../persist';

export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 520;
export const SIDEBAR_DEFAULT = 260;

export const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(width)));

interface LayoutState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
}

const KEY = 'squidcode.layout';

const load = () =>
  readStored(
    KEY,
    (value) => {
      const v = asObject(value);
      return {
        sidebarWidth: clampSidebarWidth(asNumber(v.sidebarWidth, SIDEBAR_DEFAULT)),
        sidebarCollapsed: v.sidebarCollapsed === true,
      };
    },
    { sidebarWidth: SIDEBAR_DEFAULT, sidebarCollapsed: false },
  );

export const useLayout = create<LayoutState>((set) => ({
  ...load(),
  setSidebarWidth: (width) => set({ sidebarWidth: clampSidebarWidth(width) }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

// Dragging the splitter fires this per pixel; a small synchronous write is fine.
useLayout.subscribe(({ sidebarWidth, sidebarCollapsed }) =>
  writeStored(KEY, { sidebarWidth, sidebarCollapsed }),
);

import { create } from 'zustand';
import { asNumber, asObject, readStored, writeStored } from '../persist';

export type ThemeSetting = 'system' | 'light' | 'dark';

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 13;

export const clampFontSize = (size: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));

interface SettingsState {
  theme: ThemeSetting;
  /** Editor font size in px. */
  fontSize: number;
  setTheme: (theme: ThemeSetting) => void;
  setFontSize: (size: number) => void;
}

const KEY = 'squidcode.settings';
const THEMES: ThemeSetting[] = ['system', 'light', 'dark'];

const load = () =>
  readStored(
    KEY,
    (value) => {
      const v = asObject(value);
      return {
        theme: THEMES.find((t) => t === v.theme) ?? 'system',
        fontSize: clampFontSize(asNumber(v.fontSize, FONT_SIZE_DEFAULT)),
      };
    },
    { theme: 'system' as ThemeSetting, fontSize: FONT_SIZE_DEFAULT },
  );

export const useSettings = create<SettingsState>((set) => ({
  ...load(),
  setTheme: (theme) => set({ theme }),
  setFontSize: (size) => set({ fontSize: clampFontSize(size) }),
}));

useSettings.subscribe(({ theme, fontSize }) => writeStored(KEY, { theme, fontSize }));

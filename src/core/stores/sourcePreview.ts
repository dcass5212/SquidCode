import { create } from 'zustand';

export type ViewMode = 'source' | 'split' | 'preview';

export const MIN_RATIO = 0.2;
export const MAX_RATIO = 0.8;

interface SourcePreviewState {
  mode: ViewMode;
  /** Share of the width given to the source pane in split mode. */
  ratio: number;
  setMode: (mode: ViewMode) => void;
  setRatio: (ratio: number) => void;
}

// Shared by every source+preview handler (Markdown, HTML). Not persisted yet — settings persistence is M4.
export const useSourcePreview = create<SourcePreviewState>((set) => ({
  mode: 'split',
  ratio: 0.5,
  setMode: (mode) => set({ mode }),
  setRatio: (ratio) => set({ ratio: Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio)) }),
}));

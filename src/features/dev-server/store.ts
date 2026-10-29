import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { events } from '../../core/events';
import { findLocalUrl, stripAnsi } from './detectUrl';

const MAX_LINES = 300;

interface DevServerState {
  running: boolean;
  /** Last address seen in the output, once the server announces one. */
  url: string | null;
  lines: string[];
  error: string | null;
  start: (command: string) => Promise<void>;
  stop: () => Promise<void>;
}

export const useDevServer = create<DevServerState>((set, get) => ({
  running: false,
  url: null,
  lines: [],
  error: null,

  async start(command) {
    set({ running: true, url: null, lines: [], error: null });
    try {
      await invoke('dev_start', { command });
    } catch (e) {
      const message = typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
      set({ running: false, error: message });
    }
  },

  async stop() {
    if (get().running) await invoke('dev_stop').catch(() => {});
  },
}));

// Registered once at module load (the feature is imported at startup). Tauri's event API needs a
// webview `window`, which tests importing the registry don't have.
if (typeof window !== 'undefined') {
  void listen<string>('dev:output', ({ payload }) => {
    const line = stripAnsi(payload);
    useDevServer.setState((s) => ({
      lines: [...s.lines, line].slice(-MAX_LINES),
      url: s.url ?? findLocalUrl(line),
    }));
  });

  void listen<{ code: number | null }>('dev:exit', ({ payload }) => {
    useDevServer.setState((s) => ({
      running: false,
      lines:
        payload.code === null || s.lines.length === 0
          ? s.lines
          : [...s.lines, `[exited with code ${payload.code}]`],
    }));
  });
}

// A server belongs to the folder it was started in.
events.on('workspace:changed', () => void useDevServer.getState().stop());

import { create } from 'zustand';
import { events } from '../events';
import { pickFolder, readDir, restoreFolder, type Entry } from '../fs';
import { readStored, writeStored } from '../persist';
import { useDocuments } from './documents';

interface WorkspaceState {
  root: string | null;
  /** Directory path -> its entries (unsorted), filled lazily on first expand. */
  children: Record<string, Entry[]>;
  expanded: Record<string, true>;
  showHidden: boolean;
  error: string | null;
  openFolder: () => Promise<void>;
  /** Reopens the folder from the last session, if Rust still remembers one. */
  restoreLastFolder: () => Promise<void>;
  toggleDir: (path: string) => Promise<void>;
  /** Re-reads the root and every expanded folder, e.g. after files changed outside the app. */
  refresh: () => Promise<void>;
  toggleShowHidden: () => void;
}

/** Joins using the separator the root already uses, so every path has one consistent spelling. */
export function joinPath(parent: string, name: string): string {
  const sep = parent.includes('\\') ? '\\' : '/';
  return parent.endsWith(sep) ? parent + name : parent + sep + name;
}

const HIDDEN_KEY = 'squidcode.showHidden';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useWorkspace = create<WorkspaceState>((set, get) => {
  /** Loads one level into the cache; failures surface in `error` and leave the cache untouched. */
  async function load(path: string): Promise<boolean> {
    try {
      const entries = await readDir(path);
      set((s) => ({ children: { ...s.children, [path]: entries }, error: null }));
      return true;
    } catch (e) {
      set({ error: message(e) });
      return false;
    }
  }

  async function enter(root: string) {
    events.emit('workspace:closing', { root: get().root });
    useDocuments.getState().closeAll();
    set({ root, children: {}, expanded: {}, error: null });
    await load(root);
    events.emit('workspace:changed', { root });
  }

  return {
    root: null,
    children: {},
    expanded: {},
    showHidden: readStored(HIDDEN_KEY, (v) => v === true, false),
    error: null,

    async openFolder() {
      // Ask before the dialog: picking replaces Rust's scope, after which old files can't be saved.
      if (!(await useDocuments.getState().confirmDiscardAll())) return;
      let picked: string | null;
      try {
        picked = await pickFolder();
      } catch (e) {
        set({ error: message(e) });
        return;
      }
      if (!picked) return;
      await enter(picked);
    },

    async restoreLastFolder() {
      if (get().root) return;
      const saved = await restoreFolder().catch(() => null);
      if (saved && !get().root) await enter(saved);
    },

    async toggleDir(path) {
      const { expanded, children } = get();
      if (expanded[path]) {
        set((s) => {
          const rest = { ...s.expanded };
          delete rest[path];
          return { expanded: rest };
        });
        return;
      }
      if (!children[path] && !(await load(path))) return;
      set((s) => ({ expanded: { ...s.expanded, [path]: true } }));
    },

    async refresh() {
      const { root, expanded } = get();
      if (!root) return;
      // Folders deleted on disk fail to load; collapse them instead of leaving stale rows.
      const gone: string[] = [];
      for (const dir of [root, ...Object.keys(expanded)]) {
        if (!(await load(dir)) && dir !== root) gone.push(dir);
      }
      if (gone.length === 0) return;
      set((s) => {
        const rest = { ...s.expanded };
        for (const dir of gone) delete rest[dir];
        return { expanded: rest, error: null };
      });
    },

    toggleShowHidden: () => {
      const showHidden = !get().showHidden;
      set({ showHidden });
      writeStored(HIDDEN_KEY, showHidden);
    },
  };
});

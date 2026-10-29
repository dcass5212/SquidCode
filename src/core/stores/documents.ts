import { create } from 'zustand';
import { events } from '../events';
import { FsError, readFile, writeFile, type FsErrorKind } from '../fs';
import { detectEol, toDiskText, toEditorText, type Eol } from '../lineEndings';
import { ask, tell } from './dialog';

export interface Doc {
  path: string;
  status: 'loading' | 'ready' | 'error';
  /** Set when status is 'error', e.g. 'binary' or 'too_large'. */
  errorKind?: FsErrorKind;
  error?: string;
  /** Current editor text (LF-normalized) and the text last read from / written to disk. */
  text: string;
  savedText: string;
  /** Disk mtime at last read/write; sent back on save to detect external changes. */
  mtimeMs: number;
  eol: Eol;
  saving: boolean;
}

interface DocumentsState {
  docs: Record<string, Doc>;
  /** Tab order. */
  tabs: string[];
  activePath: string | null;
  open: (path: string) => Promise<void>;
  activate: (path: string) => void;
  setText: (path: string, text: string) => void;
  save: (path: string) => Promise<boolean>;
  /** Asks about unsaved changes first; false if the user cancelled. */
  close: (path: string) => Promise<boolean>;
  /** Replaces the tab's text with the file on disk, discarding unsaved edits (caller asked). */
  reloadFromDisk: (path: string) => Promise<void>;
  /** Guard for folder switch and app exit: true when it is safe to throw everything away. */
  confirmDiscardAll: () => Promise<boolean>;
  closeAll: () => void;
}

/** Tabs that are not files on disk (e.g. `web:1`). They are always ready and never dirty. */
export const isVirtualPath = (path: string) => path.startsWith('web:');

export const isDirty = (doc: Doc | undefined): boolean =>
  !!doc && doc.status === 'ready' && doc.text !== doc.savedText;

const blank = (path: string): Doc => ({
  path,
  status: 'loading',
  text: '',
  savedText: '',
  mtimeMs: 0,
  eol: 'lf',
  saving: false,
});

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useDocuments = create<DocumentsState>((set, get) => {
  const patch = (path: string, changes: Partial<Doc>) =>
    set((s) => {
      const doc = s.docs[path];
      return doc ? { docs: { ...s.docs, [path]: { ...doc, ...changes } } } : s;
    });

  function remove(path: string) {
    set((s) => {
      const index = s.tabs.indexOf(path);
      const tabs = s.tabs.filter((p) => p !== path);
      const docs = { ...s.docs };
      delete docs[path];
      // Closing the active tab moves to its right neighbour, else the left one.
      const activePath =
        s.activePath === path ? (tabs[index] ?? tabs[index - 1] ?? null) : s.activePath;
      return { docs, tabs, activePath };
    });
    events.emit('doc:closed', { path });
  }

  /** Stops at the first failed or cancelled save so nothing is discarded by accident. */
  async function saveAllDirty(): Promise<boolean> {
    for (const path of get().tabs) {
      if (isDirty(get().docs[path]) && !(await get().save(path))) return false;
    }
    return true;
  }

  return {
    docs: {},
    tabs: [],
    activePath: null,

    async open(path) {
      if (get().docs[path]) {
        set({ activePath: path });
        return;
      }
      if (isVirtualPath(path)) {
        const doc: Doc = { ...blank(path), status: 'ready' };
        set((s) => ({
          docs: { ...s.docs, [path]: doc },
          tabs: [...s.tabs, path],
          activePath: path,
        }));
        return;
      }
      const loading = blank(path);
      set((s) => ({
        docs: { ...s.docs, [path]: loading },
        tabs: [...s.tabs, path],
        activePath: path,
      }));
      try {
        const file = await readFile(path);
        const text = toEditorText(file.text);
        // `patch` is a no-op if the tab was closed while loading.
        patch(path, {
          status: 'ready',
          text,
          savedText: text,
          mtimeMs: file.mtimeMs,
          eol: detectEol(file.text),
        });
        events.emit('doc:opened', { path });
      } catch (e) {
        patch(path, {
          status: 'error',
          errorKind: e instanceof FsError ? e.kind : 'io',
          error: message(e),
        });
      }
    },

    activate: (path) => set((s) => (s.docs[path] ? { activePath: path } : s)),

    setText: (path, text) => patch(path, { text }),

    async save(path) {
      const doc = get().docs[path];
      if (!doc || doc.status !== 'ready' || isVirtualPath(path)) return true;
      if (doc.saving) return false;
      const snapshot = doc.text;
      const disk = toDiskText(snapshot, doc.eol);
      patch(path, { saving: true });
      try {
        let mtimeMs: number;
        try {
          mtimeMs = await writeFile(path, disk, doc.mtimeMs);
        } catch (e) {
          if (!(e instanceof FsError) || e.kind !== 'conflict') throw e;
          const choice = await ask({
            title: 'File changed on disk',
            message: `${fileName(path)} was modified outside SquidCode since you opened it. Overwrite it with your version?`,
            buttons: [
              { id: 'cancel', label: 'Cancel' },
              { id: 'overwrite', label: 'Overwrite', danger: true },
            ],
          });
          if (choice !== 'overwrite') return false;
          mtimeMs = await writeFile(path, disk); // no expected mtime: the user chose to overwrite
        }
        // Edits typed while the write was in flight keep the doc dirty.
        patch(path, { savedText: snapshot, mtimeMs });
        events.emit('file:saved', { path });
        return true;
      } catch (e) {
        await tell(`Could not save ${fileName(path)}`, message(e));
        return false;
      } finally {
        patch(path, { saving: false });
      }
    },

    async reloadFromDisk(path) {
      const file = await readFile(path);
      const text = toEditorText(file.text);
      patch(path, {
        status: 'ready',
        text,
        savedText: text,
        mtimeMs: file.mtimeMs,
        eol: detectEol(file.text),
      });
    },

    async close(path) {
      const doc = get().docs[path];
      if (!doc) return true;
      if (isDirty(doc)) {
        set({ activePath: path }); // show the user which file is being asked about
        const choice = await ask({
          title: 'Unsaved changes',
          message: `Save changes to ${fileName(path)} before closing?`,
          buttons: [
            { id: 'cancel', label: 'Cancel' },
            { id: 'discard', label: "Don't save", danger: true },
            { id: 'save', label: 'Save', primary: true },
          ],
        });
        if (choice === 'save') {
          if (!(await get().save(path))) return false;
        } else if (choice !== 'discard') {
          return false;
        }
      }
      remove(path);
      return true;
    },

    async confirmDiscardAll() {
      const dirty = get().tabs.filter((p) => isDirty(get().docs[p]));
      if (dirty.length === 0) return true;
      const choice = await ask({
        title: 'Unsaved changes',
        message:
          dirty.length === 1
            ? `Save changes to ${fileName(dirty[0] as string)}?`
            : `Save changes to ${dirty.length} files?`,
        buttons: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'discard', label: "Don't save", danger: true },
          { id: 'save', label: dirty.length === 1 ? 'Save' : 'Save all', primary: true },
        ],
      });
      if (choice === 'discard') return true;
      return choice === 'save' && (await saveAllDirty());
    },

    closeAll() {
      for (const path of get().tabs) events.emit('doc:closed', { path });
      set({ docs: {}, tabs: [], activePath: null });
    },
  };
});

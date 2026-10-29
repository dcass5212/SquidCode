import { create } from 'zustand';
import { events } from '../../core/events';
import { useDocuments } from '../../core/stores/documents';
import { useWorkspace } from '../../core/stores/workspace';
import { loadSaved, saveSaved } from './saved';

export const DEFAULT_URL = 'http://localhost:5173/';

interface WebTabsState {
  /** Address of each open Web tab, keyed by its `web:N` path. */
  urls: Record<string, string>;
  setUrl: (path: string, url: string) => void;
}

/** Remembers this folder's Web tabs (in open order) so reopening the folder brings them back. */
function persist() {
  const root = useWorkspace.getState().root;
  if (root) saveSaved(root, Object.values(useWebTabs.getState().urls));
}

export const useWebTabs = create<WebTabsState>((set) => ({
  urls: {},
  setUrl: (path, url) => {
    set((s) => ({ urls: { ...s.urls, [path]: url } }));
    persist();
  },
}));

events.on('doc:closed', ({ path }) => {
  // `closeAll` (folder switch) emits before it clears `docs`; a single close clears first.
  // A bulk close must not overwrite the old folder's saved tabs with an empty list.
  const bulk = path in useDocuments.getState().docs;
  useWebTabs.setState((s) => {
    const urls = { ...s.urls };
    delete urls[path];
    return { urls };
  });
  if (!bulk) persist();
});

events.on('workspace:changed', ({ root }) => {
  if (!root) return;
  const before = useDocuments.getState().activePath;
  for (const url of loadSaved(root)) openWebTab(url);
  // Quietly bring the tabs back; don't steal focus to a server that may not be running yet.
  useDocuments.setState({ activePath: before });
});

let nextId = 1;

/** Opens a new Web tab as a virtual document so tabs, close and activation work unchanged. */
export function openWebTab(url = DEFAULT_URL) {
  const path = `web:${nextId++}`;
  useWebTabs.getState().setUrl(path, url);
  void useDocuments.getState().open(path);
}

import { events } from '../../core/events';
import { writeStored } from '../../core/persist';
import { isVirtualPath, useDocuments } from '../../core/stores/documents';
import { useWorkspace } from '../../core/stores/workspace';
import { loadSession, sessionKey } from './saved';

/** The folder whose tabs we are allowed to save; null while switching or restoring. */
let trackedRoot: string | null = null;

function save() {
  if (!trackedRoot) return;
  const { tabs, activePath } = useDocuments.getState();
  const files = tabs.filter((p) => !isVirtualPath(p));
  writeStored(sessionKey(trackedRoot), {
    files,
    active: activePath && !isVirtualPath(activePath) ? activePath : null,
  });
}

useDocuments.subscribe(save);

// Without this, closing the old folder's tabs would overwrite its saved session with nothing.
events.on('workspace:closing', () => {
  trackedRoot = null;
});

events.on('workspace:changed', ({ root }) => {
  if (!root) return;
  void restore(root);
});

async function restore(root: string) {
  const { files, active } = loadSession(root);
  const before = useDocuments.getState().activePath; // Web tabs may already be restored
  for (const path of files) {
    await useDocuments.getState().open(path);
    // A file deleted or turned binary since last time is dropped quietly, not left as an error tab.
    if (useDocuments.getState().docs[path]?.status === 'error') {
      await useDocuments.getState().close(path);
    }
    if (useWorkspace.getState().root !== root) return; // user switched folders meanwhile
  }
  const { docs, activate } = useDocuments.getState();
  if (active && docs[active]) activate(active);
  else if (before && docs[before]) activate(before);
  trackedRoot = root;
  save();
}

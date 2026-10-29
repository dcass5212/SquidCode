import { stat } from '../../core/fs';
import { ask, useDialog } from '../../core/stores/dialog';
import { isDirty, isVirtualPath, useDocuments } from '../../core/stores/documents';
import { mtimeDiffers } from './changes';

const POLL_MS = 2000;
const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** Disk mtimes the user already answered for ("keep mine"), so we don't ask again every poll. */
const handled = new Map<string, number>();
let checking = false;

async function check(path: string) {
  const doc = useDocuments.getState().docs[path];
  if (!doc || doc.status !== 'ready' || doc.saving || isVirtualPath(path)) return;
  // A missing file is the save path's problem (it reports the error); stay quiet here.
  const disk = await stat(path).catch(() => null);
  if (!disk || !mtimeDiffers(disk.mtimeMs, doc.mtimeMs)) {
    handled.delete(path);
    return;
  }
  if (handled.get(path) === disk.mtimeMs) return;
  handled.set(path, disk.mtimeMs);

  const reload = () => useDocuments.getState().reloadFromDisk(path).catch(() => undefined);
  if (!isDirty(useDocuments.getState().docs[path])) {
    await reload();
    return;
  }
  const choice = await ask({
    title: 'File changed on disk',
    message: `${fileName(path)} was modified outside SquidCode and you have unsaved changes. Reload it and lose your edits?`,
    buttons: [
      { id: 'keep', label: 'Keep my version' },
      { id: 'reload', label: 'Reload from disk', danger: true },
    ],
  });
  // Keeping leaves the old mtime in place, so saving later still gets the overwrite prompt.
  if (choice === 'reload') await reload();
}

async function checkAll() {
  // Never talk over a dialog the user is already answering.
  if (checking || document.visibilityState !== 'visible' || useDialog.getState().current) return;
  checking = true;
  try {
    for (const path of useDocuments.getState().tabs) await check(path);
  } finally {
    checking = false;
  }
}

// The registry is also imported by node-based tests, where there is no window to watch from.
if (typeof window !== 'undefined') {
  window.setInterval(() => void checkAll(), POLL_MS);
  // Alt-tabbing back from an editor that just saved should react at once, not after the next tick.
  window.addEventListener('focus', () => void checkAll());
}

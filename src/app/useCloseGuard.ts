import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';
import { isDirty, useDocuments } from '../core/stores/documents';

/** Intercepts window close while any tab has unsaved changes. */
export function useCloseGuard() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    // Outside Tauri (plain `vite` in a browser) there is no window API; skip quietly.
    getCurrentWindow()
      .onCloseRequested(async (event) => {
        const { docs, confirmDiscardAll } = useDocuments.getState();
        if (!Object.values(docs).some(isDirty)) return;
        event.preventDefault();
        if (await confirmDiscardAll()) await getCurrentWindow().destroy();
      })
      .then((fn) => (disposed ? fn() : (unlisten = fn)))
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}

import { useDocuments } from '../../core/stores/documents';
import type { Feature } from '../types';

/** Moves the active tab by `step`, wrapping around. */
function cycle(step: number) {
  const { tabs, activePath, activate } = useDocuments.getState();
  if (tabs.length < 2) return;
  const index = activePath ? tabs.indexOf(activePath) : -1;
  activate(tabs[(index + step + tabs.length) % tabs.length] as string);
}

/** The tab strip itself is rendered by the shell (`TabBar`); this registers its commands. */
export const tabs: Feature = {
  id: 'tabs',
  commands: [
    {
      id: 'tab.close',
      title: 'Close tab',
      keybinding: 'Ctrl+W',
      run: () => {
        const { activePath, close } = useDocuments.getState();
        if (activePath) void close(activePath);
      },
    },
    { id: 'tab.next', title: 'Next tab', keybinding: 'Ctrl+Tab', run: () => cycle(1) },
    { id: 'tab.previous', title: 'Previous tab', keybinding: 'Ctrl+Shift+Tab', run: () => cycle(-1) },
  ],
};

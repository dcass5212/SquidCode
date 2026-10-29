import type { ComponentType } from 'react';
import type { IconName } from '../ui/Icon';

/** Props every file handler receives. Handlers read their document from the documents store. */
export interface DocProps {
  path: string;
}

export interface Feature {
  id: string;
  /** Highest `match` wins; 0 or less means "not mine". */
  fileHandlers?: { match: (path: string) => number; component: ComponentType<DocProps> }[];
  sidebarPanels?: { id: string; title: string; icon: IconName; component: ComponentType }[];
  /** `mouseButton` is a MouseEvent.button value (3 = back, 4 = forward) that also triggers the command. */
  commands?: { id: string; title: string; keybinding?: string; mouseButton?: number; run: () => void }[];
  /** Controls shown at the end of the tab row. */
  toolbarItems?: { id: string; component: ComponentType }[];
  statusBarItems?: { id: string; side: 'left' | 'right'; component: ComponentType }[];
}

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
  commands?: { id: string; title: string; keybinding?: string; run: () => void }[];
  statusBarItems?: { id: string; side: 'left' | 'right'; component: ComponentType }[];
}

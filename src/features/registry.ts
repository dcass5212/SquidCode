import type { ComponentType } from 'react';
import { devServer } from './dev-server';
import { editor } from './editor';
import { fileTree } from './file-tree';
import { help } from './help';
import { markdownPreview } from './markdown-preview';
import { fileWatch } from './file-watch';
import { session } from './session';
import { settings } from './settings';
import { tabs } from './tabs';
import { webPreview } from './web-preview';
import type { DocProps, Feature } from './types';

/**
 * Add a feature by creating a folder under src/features/ and listing it here — one line,
 * no edits to core or shell.
 */
export const features: Feature[] = [
  fileTree,
  editor,
  markdownPreview,
  webPreview,
  devServer,
  tabs,
  settings,
  fileWatch,
  session,
  help,
];

export function createRegistry(list: Feature[]) {
  return {
    sidebarPanels: () => list.flatMap((f) => f.sidebarPanels ?? []),
    commands: () => list.flatMap((f) => f.commands ?? []),
    statusBarItems: (side: 'left' | 'right') =>
      list.flatMap((f) => f.statusBarItems ?? []).filter((i) => i.side === side),
    /** Picks the handler with the highest positive match score for this path. */
    resolveFileHandler(path: string): ComponentType<DocProps> | null {
      let best: { score: number; component: ComponentType<DocProps> } | null = null;
      for (const handler of list.flatMap((f) => f.fileHandlers ?? [])) {
        const score = handler.match(path);
        if (score > 0 && (!best || score > best.score)) {
          best = { score, component: handler.component };
        }
      }
      return best?.component ?? null;
    },
  };
}

export const registry = createRegistry(features);

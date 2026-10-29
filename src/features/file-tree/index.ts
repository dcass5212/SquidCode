import { useWorkspace } from '../../core/stores/workspace';
import type { Feature } from '../types';
import { FileTreePanel } from './FileTreePanel';

export const fileTree: Feature = {
  id: 'file-tree',
  sidebarPanels: [{ id: 'file-tree', title: 'Files', icon: 'folder', component: FileTreePanel }],
  commands: [
    {
      id: 'tree.refresh',
      title: 'Refresh file tree',
      keybinding: 'F5',
      run: () => void useWorkspace.getState().refresh(),
    },
    {
      id: 'folder.open',
      title: 'Open folder',
      keybinding: 'Ctrl+O',
      run: () => void useWorkspace.getState().openFolder(),
    },
  ],
};

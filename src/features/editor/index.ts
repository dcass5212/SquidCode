import { useDocuments } from '../../core/stores/documents';
import type { Feature } from '../types';
import { EditorPane } from './EditorPane';

export const editor: Feature = {
  id: 'editor',
  // Priority 1: the fallback for any file; richer handlers (e.g. Markdown) outrank it.
  fileHandlers: [{ match: () => 1, component: EditorPane }],
  commands: [
    {
      id: 'file.save',
      title: 'Save',
      keybinding: 'Ctrl+S',
      run: () => {
        const { activePath, save } = useDocuments.getState();
        if (activePath) void save(activePath);
      },
    },
  ],
};

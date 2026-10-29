import type { Feature } from '../types';
import { MarkdownPane } from './MarkdownPane';

const isMarkdown = (path: string) => /\.(md|markdown|mdx)$/i.test(path);

export const markdownPreview: Feature = {
  id: 'markdown-preview',
  // Outranks the generic editor (priority 1).
  fileHandlers: [{ match: (path) => (isMarkdown(path) ? 10 : 0), component: MarkdownPane }],
};

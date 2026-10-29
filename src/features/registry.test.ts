import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry';
import type { Feature } from './types';

const Generic = () => null;
const Markdown = () => null;

const features: Feature[] = [
  { id: 'editor', fileHandlers: [{ match: () => 1, component: Generic }] },
  {
    id: 'markdown-preview',
    fileHandlers: [{ match: (p) => (p.endsWith('.md') ? 10 : 0), component: Markdown }],
    statusBarItems: [{ id: 'md', side: 'right', component: Markdown }],
  },
];

describe('registry', () => {
  const registry = createRegistry(features);

  it('resolves the highest-priority file handler', () => {
    expect(registry.resolveFileHandler('notes/README.md')).toBe(Markdown);
    expect(registry.resolveFileHandler('src/main.rs')).toBe(Generic);
  });

  it('returns null when no handler claims the path', () => {
    expect(createRegistry([]).resolveFileHandler('a.txt')).toBeNull();
  });

  it('filters status bar items by side', () => {
    expect(registry.statusBarItems('right')).toHaveLength(1);
    expect(registry.statusBarItems('left')).toHaveLength(0);
  });
});

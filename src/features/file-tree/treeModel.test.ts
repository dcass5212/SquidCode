import { describe, expect, it } from 'vitest';
import type { Entry } from '../../core/fs';
import { buildRows, sortEntries } from './treeModel';

const e = (name: string, kind: Entry['kind'] = 'file'): Entry => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
});

describe('sortEntries', () => {
  it('puts folders first, then sorts case-insensitively', () => {
    const names = sortEntries([e('b.md'), e('Zed', 'dir'), e('A.md'), e('alpha', 'dir')]).map(
      (x) => x.name,
    );
    expect(names).toEqual(['alpha', 'Zed', 'A.md', 'b.md']);
  });

  it('orders numbers naturally', () => {
    const names = sortEntries([e('10.md'), e('2.md')]).map((x) => x.name);
    expect(names).toEqual(['2.md', '10.md']);
  });
});

describe('buildRows', () => {
  const children = {
    'C:\\p': [
      e('src', 'dir'),
      e('.vscode', 'dir'),
      e('.gitignore'),
      e('node_modules', 'dir'),
      e('README.md'),
    ],
    'C:\\p\\src': [e('main.ts')],
  };

  it('hides dot-folders and ignored folders by default, but keeps dotfiles', () => {
    const rows = buildRows({ root: 'C:\\p', children, expanded: {}, showHidden: false });
    expect(rows.map((r) => r.name)).toEqual(['src', '.gitignore', 'README.md']);
  });

  it('shows hidden folders flagged as hidden when the toggle is on', () => {
    const rows = buildRows({ root: 'C:\\p', children, expanded: {}, showHidden: true });
    expect(rows.filter((r) => r.hidden).map((r) => r.name)).toEqual(['.vscode', 'node_modules']);
  });

  it('descends only into expanded folders, with depth', () => {
    const rows = buildRows({
      root: 'C:\\p',
      children,
      expanded: { 'C:\\p\\src': true },
      showHidden: false,
    });
    expect(rows.map((r) => [r.path, r.depth])).toEqual([
      ['C:\\p\\src', 0],
      ['C:\\p\\src\\main.ts', 1],
      ['C:\\p\\.gitignore', 0],
      ['C:\\p\\README.md', 0],
    ]);
  });
});

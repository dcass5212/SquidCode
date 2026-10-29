import type { Entry, EntryKind } from '../../core/fs';
import { joinPath } from '../../core/stores/workspace';

/** Folders that are noise in nearly every project; hidden by default like dot-folders. */
const IGNORED_DIRS = new Set(['node_modules', '.git', 'target', 'dist']);

export interface TreeRow {
  path: string;
  name: string;
  kind: EntryKind;
  depth: number;
  expanded: boolean;
  /** Dot-folder or ignored folder: dimmed when shown, omitted when the toggle is off. */
  hidden: boolean;
}

// Dotfiles (.gitignore, .env.example, .eslintrc) are config worth seeing, so only folders hide.
export const isHidden = (e: Pick<Entry, 'name' | 'kind'>) =>
  e.kind === 'dir' && (e.name.startsWith('.') || IGNORED_DIRS.has(e.name));

/** Folders first, then files; alphabetical, case-insensitive, digits compared numerically. */
export function sortEntries(entries: Entry[]): Entry[] {
  const rank = (e: Entry) => (e.kind === 'dir' ? 0 : 1);
  return [...entries].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }),
  );
}

interface TreeInput {
  root: string;
  children: Record<string, Entry[]>;
  expanded: Record<string, true>;
  showHidden: boolean;
}

/** Flattens the expanded tree into visible rows — keeps rendering and keyboard nav simple. */
export function buildRows({ root, children, expanded, showHidden }: TreeInput): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (dir: string, depth: number) => {
    for (const entry of sortEntries(children[dir] ?? [])) {
      const hidden = isHidden(entry);
      if (hidden && !showHidden) continue;
      const path = joinPath(dir, entry.name);
      const isOpen = entry.kind === 'dir' && !!expanded[path];
      rows.push({ path, name: entry.name, kind: entry.kind, depth, expanded: isOpen, hidden });
      if (isOpen) walk(path, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useDocuments } from '../../core/stores/documents';
import { useWorkspace } from '../../core/stores/workspace';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import styles from './FileTreePanel.module.css';
import { buildRows, type TreeRow } from './treeModel';

const folderName = (root: string) => root.split(/[\\/]/).filter(Boolean).pop() ?? root;

const iconFor = (row: TreeRow) =>
  row.kind === 'dir'
    ? row.expanded
      ? 'folder-open'
      : 'folder'
    : row.name.toLowerCase().endsWith('.md')
      ? 'file-text'
      : 'file';

export function FileTreePanel() {
  const { root, children, expanded, showHidden, error } = useWorkspace();
  const { openFolder, refresh, toggleDir, toggleShowHidden } = useWorkspace.getState();
  const activePath = useDocuments((s) => s.activePath);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => (root ? buildRows({ root, children, expanded, showHidden }) : []),
    [root, children, expanded, showHidden],
  );

  if (!root) {
    return (
      <div className={styles.empty}>
        <span>No folder open</span>
        <Button onClick={() => void openFolder()}>Open folder</Button>
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    );
  }

  // Roving tabindex: exactly one row is in the tab order.
  const focusIndex = Math.max(
    0,
    rows.findIndex((r) => r.path === focusedPath),
  );

  const moveFocus = (index: number) => {
    const row = rows[index];
    if (!row) return;
    setFocusedPath(row.path);
    treeRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  };

  const activate = (row: TreeRow) => {
    setFocusedPath(row.path);
    if (row.kind === 'dir') void toggleDir(row.path);
    else void useDocuments.getState().open(row.path);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const row = rows[focusIndex];
    if (!row) return;
    switch (e.key) {
      case 'ArrowDown':
        moveFocus(Math.min(rows.length - 1, focusIndex + 1));
        break;
      case 'ArrowUp':
        moveFocus(Math.max(0, focusIndex - 1));
        break;
      case 'Home':
        moveFocus(0);
        break;
      case 'End':
        moveFocus(rows.length - 1);
        break;
      case 'ArrowRight':
        if (row.kind === 'dir' && !row.expanded) void toggleDir(row.path);
        else if (row.kind === 'dir') moveFocus(focusIndex + 1);
        break;
      case 'ArrowLeft':
        if (row.kind === 'dir' && row.expanded) void toggleDir(row.path);
        else {
          // Walk back to the nearest shallower row: the parent folder.
          for (let i = focusIndex - 1; i >= 0; i--) {
            if ((rows[i]?.depth ?? 0) < row.depth) {
              moveFocus(i);
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        activate(row);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <>
      <header className={styles.header}>
        <span className={styles.rootName} title={root}>
          {folderName(root)}
        </span>
        <button
          className={styles.iconButton}
          onClick={() => void refresh()}
          title="Refresh file tree"
          aria-label="Refresh file tree"
        >
          <Icon name="rotate-cw" />
        </button>
        <button
          className={styles.iconButton}
          onClick={() => void openFolder()}
          title="Open another folder"
          aria-label="Open another folder"
        >
          <Icon name="folder-open" />
        </button>
        <button
          className={styles.iconButton}
          onClick={toggleShowHidden}
          title={
            showHidden
              ? 'Hide dot-folders and ignored folders'
              : 'Show dot-folders and ignored folders'
          }
          aria-label="Toggle hidden files"
          aria-pressed={showHidden}
        >
          <Icon name={showHidden ? 'eye' : 'eye-off'} />
        </button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-label={folderName(root)}
        onKeyDown={onKeyDown}
      >
        {rows.length === 0 && !error ? <div className={styles.note}>Empty folder</div> : null}
        {rows.map((row, i) => (
          <div
            key={row.path}
            className={styles.row}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-expanded={row.kind === 'dir' ? row.expanded : undefined}
            aria-selected={row.path === activePath}
            data-index={i}
            data-hidden={row.hidden || undefined}
            data-active={row.path === activePath || undefined}
            tabIndex={i === focusIndex ? 0 : -1}
            style={{ '--depth': row.depth } as React.CSSProperties}
            onClick={() => activate(row)}
            onFocus={() => setFocusedPath(row.path)}
          >
            <span className={styles.chevron} data-open={row.expanded || undefined}>
              {row.kind === 'dir' ? <Icon name="chevron-right" size={14} /> : null}
            </span>
            <span className={styles.icon} data-kind={row.kind}>
              <Icon name={iconFor(row)} />
            </span>
            <span className={styles.name}>{row.name}</span>
          </div>
        ))}
      </div>
    </>
  );
}

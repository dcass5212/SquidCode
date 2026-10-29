import { useEffect, useState, type CSSProperties } from 'react';
import { SIDEBAR_MAX, SIDEBAR_MIN, useLayout } from '../core/stores/layout';
import { matchesKeybinding } from '../core/keybindings';
import { useDocuments } from '../core/stores/documents';
import { useDialog } from '../core/stores/dialog';
import { useWorkspace } from '../core/stores/workspace';
import { registry } from '../features/registry';
import { Button } from '../ui/Button';
import { TabBar } from '../features/tabs/TabBar';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { Splitter } from '../ui/Splitter';
import { DocumentArea } from './DocumentArea';
import styles from './Shell.module.css';
import { useCloseGuard } from './useCloseGuard';

/** Static layout; everything that varies comes from the feature registry. */
export function Shell() {
  const panels = registry.sidebarPanels();
  const left = registry.statusBarItems('left');
  const right = registry.statusBarItems('right');
  const toolbar = registry.toolbarItems();

  const { sidebarWidth, sidebarCollapsed, setSidebarWidth, toggleSidebar } = useLayout();
  const root = useWorkspace((s) => s.root);
  const openFolder = useWorkspace((s) => s.openFolder);
  const hasActiveDoc = useDocuments((s) => s.activePath !== null);
  // Transitions would make the sidebar lag behind the pointer while dragging.
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        useLayout.getState().toggleSidebar();
        return;
      }
      for (const command of registry.commands()) {
        if (command.keybinding && matchesKeybinding(e, command.keybinding)) {
          e.preventDefault();
          command.run();
          return;
        }
      }
    };
    // Side mouse buttons trigger commands that declare `mouseButton`. Cancelling mousedown as well as
    // mouseup keeps the webview from treating them as history navigation.
    const onMouseButton = (e: MouseEvent) => {
      const command = registry.commands().find((c) => c.mouseButton === e.button);
      if (!command) return;
      e.preventDefault();
      // A modal is waiting on an answer about the current tab; don't switch it underneath.
      if (e.type === 'mouseup' && !useDialog.getState().current) command.run();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseButton);
    window.addEventListener('mouseup', onMouseButton);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseButton);
      window.removeEventListener('mouseup', onMouseButton);
    };
  }, []);

  useCloseGuard();

  return (
    <div
      className={styles.shell}
      data-dragging={dragging || undefined}
      data-collapsed={sidebarCollapsed || undefined}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <aside className={styles.sidebar} aria-label="Sidebar" inert={sidebarCollapsed}>
        {panels.length === 0 ? (
          <div className={styles.sidebarEmpty}>No folder open</div>
        ) : (
          panels.map(({ id, component: Panel }) => <Panel key={id} />)
        )}
        {sidebarCollapsed ? null : (
          <Splitter
            value={sidebarWidth}
            min={SIDEBAR_MIN}
            max={SIDEBAR_MAX}
            onChange={setSidebarWidth}
            onDragChange={setDragging}
            label="Resize sidebar"
          />
        )}
      </aside>

      <main className={styles.main}>
        <div className={styles.tabbar}>
          <button
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            title="Toggle sidebar (Ctrl+B)"
            aria-label="Toggle sidebar"
            aria-pressed={!sidebarCollapsed}
          >
            <Icon name="panel-left" />
          </button>
          <TabBar />
          {toolbar.map(({ id, component: Item }) => (
            <Item key={id} />
          ))}
        </div>
        <div className={hasActiveDoc ? styles.document : styles.content}>
          {hasActiveDoc ? (
            <DocumentArea />
          ) : root ? (
            <div className={styles.empty}>
              <h1 className={styles.emptyTitle}>Pick a file</h1>
              <p className={styles.emptyHint}>Select a file in the sidebar to open it.</p>
            </div>
          ) : (
            <div className={styles.empty}>
              <h1 className={styles.emptyTitle}>Open a folder</h1>
              <p className={styles.emptyHint}>
                Browse a project and edit its files, Markdown especially.
              </p>
              <Button onClick={() => void openFolder()}>Open folder</Button>
            </div>
          )}
        </div>
      </main>

      <footer className={styles.status}>
        <div className={styles.statusGroup}>
          {left.length === 0 && !hasActiveDoc ? <span>No file open</span> : null}
          {left.map(({ id, component: Item }) => (
            <Item key={id} />
          ))}
        </div>
        <div className={styles.statusGroup}>
          {right.map(({ id, component: Item }) => (
            <Item key={id} />
          ))}
        </div>
      </footer>
      <Dialog />
    </div>
  );
}

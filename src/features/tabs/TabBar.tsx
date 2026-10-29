import { useMemo, type MouseEvent } from 'react';
import { isDirty, useDocuments } from '../../core/stores/documents';
import { Icon } from '../../ui/Icon';
import styles from './TabBar.module.css';
import { tabLabels } from './labels';

export function TabBar() {
  const tabs = useDocuments((s) => s.tabs);
  const docs = useDocuments((s) => s.docs);
  const activePath = useDocuments((s) => s.activePath);
  const { activate, close } = useDocuments.getState();
  const labels = useMemo(() => tabLabels(tabs), [tabs]);

  return (
    <div className={styles.tabs} role="tablist" aria-label="Open files">
      {tabs.map((path) => {
        const dirty = isDirty(docs[path]);
        const label = labels[path] ?? path;
        return (
          <div
            key={path}
            className={styles.tab}
            role="tab"
            aria-selected={path === activePath}
            data-active={path === activePath || undefined}
            data-dirty={dirty || undefined}
            title={path}
            tabIndex={path === activePath ? 0 : -1}
            onClick={() => activate(path)}
            // Middle click closes, like browsers and most editors.
            onAuxClick={(e: MouseEvent) => {
              if (e.button === 1) void close(path);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') activate(path);
            }}
          >
            <span className={styles.label}>{label}</span>
            <button
              className={styles.close}
              aria-label={dirty ? `Close ${label} (unsaved changes)` : `Close ${label}`}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                void close(path);
              }}
            >
              {/* The dot marks unsaved changes; hover or focus swaps it for the close icon. */}
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.x}>
                <Icon name="x" size={14} />
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

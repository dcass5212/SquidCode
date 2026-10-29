import { useEffect, useRef, useState } from 'react';
import { registry } from '../registry';
import { EXTRA_SHORTCUTS, FEATURES } from './content';
import styles from './Help.module.css';

type Tab = 'shortcuts' | 'features';

/** Status-bar button + popover listing every shortcut (from the registry) and feature. */
export function HelpItem() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('shortcuts');
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shortcuts = [
    ...registry
      .commands()
      .filter((c) => c.keybinding)
      .map((c) => ({ title: c.title, keys: c.keybinding as string })),
    ...EXTRA_SHORTCUTS,
  ];

  return (
    <div ref={wrapper} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Shortcuts and features"
      >
        Help
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Help">
          <div className={styles.tabs} role="tablist">
            {(['shortcuts', 'features'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={styles.tab}
                onClick={() => setTab(id)}
              >
                {id === 'shortcuts' ? 'Shortcuts' : 'Features'}
              </button>
            ))}
          </div>
          <div className={styles.panel} role="tabpanel">
            {tab === 'shortcuts' ? (
              <dl className={styles.list}>
                {shortcuts.map(({ title, keys }) => (
                  <div key={title} className={styles.row}>
                    <dt>{title}</dt>
                    <dd>
                      <kbd className={styles.kbd}>{keys}</kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <dl className={styles.list}>
                {FEATURES.map(({ title, text }) => (
                  <div key={title} className={styles.feature}>
                    <dt>{title}</dt>
                    <dd className={styles.text}>{text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

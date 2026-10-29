import { openUrl } from '@tauri-apps/plugin-opener';
import { useState, type FormEvent } from 'react';
import { Button } from '../../ui/Button';
import type { DocProps } from '../types';
import { useWebTabs } from './store';
import { parseWebTarget } from './urls';
import { WebActions } from './WebActions';
import { WebFrame } from './WebFrame';
import styles from './WebFrame.module.css';

/** A browser-style tab for a local dev server. Remote sites go to the system browser instead. */
export function WebTab({ path }: DocProps) {
  const url = useWebTabs((s) => s.urls[path] ?? '');
  const [draft, setDraft] = useState(url);
  const [reloadKey, setReloadKey] = useState(0);
  const target = parseWebTarget(url);

  const go = (e: FormEvent) => {
    e.preventDefault();
    const next = parseWebTarget(draft);
    if (!next) return;
    useWebTabs.getState().setUrl(path, next.url);
    setDraft(next.url);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className={styles.page}>
      <form className={styles.bar} onSubmit={go}>
        <input
          className={styles.url}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Address"
          placeholder="localhost:5173"
          spellCheck={false}
        />
        <WebActions url={target?.url ?? null} onReload={() => setReloadKey((k) => k + 1)} />
      </form>
      <div className={styles.stage}>
        {target?.local ? (
          <WebFrame url={target.url} reloadKey={reloadKey} title={target.url} />
        ) : (
          <div className={styles.note}>
            <span>
              {target
                ? 'Only localhost and 127.0.0.1 can be previewed here.'
                : 'Enter the address of a local dev server.'}
            </span>
            {target && (
              <Button onClick={() => void openUrl(target.url).catch(() => {})}>
                Open in browser
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

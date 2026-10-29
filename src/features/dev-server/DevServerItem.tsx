import { useEffect, useRef, useState } from 'react';
import { readDir } from '../../core/fs';
import { useWorkspace } from '../../core/stores/workspace';
import { Button } from '../../ui/Button';
import { openWebTab } from '../web-preview/store';
import styles from './DevServer.module.css';
import { useDevServer } from './store';

const storageKey = (root: string) => `squidcode.devCommand:${root}`;

/** Remembered command for this folder, else a guess from files that are conventional. */
async function suggestCommand(root: string): Promise<string> {
  try {
    const saved = localStorage.getItem(storageKey(root));
    if (saved) return saved;
  } catch {
    // storage unavailable: fall through to the guess
  }
  const names = new Set((await readDir(root).catch(() => [])).map((e) => e.name.toLowerCase()));
  if (names.has('run.bat')) return 'run.bat';
  if (names.has('package.json')) return 'npm run dev';
  return '';
}

/** Status-bar dot + popover to run the project's dev server without leaving the app. */
export function DevServerItem() {
  const root = useWorkspace((s) => s.root);
  const { running, url, lines, error, start, stop } = useDevServer();
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const log = useRef<HTMLPreElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !root) return;
    let alive = true;
    void suggestCommand(root).then((c) => alive && setCommand((prev) => prev || c));
    return () => {
      alive = false;
    };
  }, [open, root]);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lines]);

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

  if (!root) return null;

  const run = () => {
    try {
      localStorage.setItem(storageKey(root), command);
    } catch {
      // remembering the command is a convenience only
    }
    void start(command);
  };

  const state = running ? (url ? 'ready' : 'starting') : error ? 'error' : 'off';

  return (
    <div ref={wrapper} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Dev server"
      >
        <span className={styles.dot} data-state={state} />
        {running ? (url ?? 'Starting…') : 'Dev server'}
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Dev server">
          <form
            className={styles.row}
            onSubmit={(e) => {
              e.preventDefault();
              if (!running && command.trim()) run();
            }}
          >
            <input
              className={styles.input}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={running}
              placeholder="Command, e.g. npm run dev"
              aria-label="Dev server command"
              spellCheck={false}
            />
            {running ? (
              <Button type="button" onClick={() => void stop()}>
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!command.trim()}>
                Start
              </Button>
            )}
          </form>
          {error && <p className={styles.error}>{error}</p>}
          {url && (
            <Button type="button" onClick={() => openWebTab(url)}>
              Open {url} in a Web tab
            </Button>
          )}
          <pre ref={log} className={styles.log} aria-label="Output">
            {lines.length ? lines.join('\n') : 'Runs in the opened folder. Output appears here.'}
          </pre>
        </div>
      )}
    </div>
  );
}

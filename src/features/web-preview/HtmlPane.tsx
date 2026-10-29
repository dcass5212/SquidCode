import { useEffect, useRef, useState } from 'react';
import { events } from '../../core/events';
import { previewBuffer, previewUrl } from '../../core/fs';
import { useDocuments } from '../../core/stores/documents';
import { SourcePreview } from '../../ui/SourcePreview';
import { CodeEditor } from '../editor/CodeEditor';
import { EditorPane } from '../editor/EditorPane';
import type { DocProps } from '../types';
import { WebActions } from './WebActions';
import { WebFrame } from './WebFrame';
import styles from './WebFrame.module.css';

/** HTML handler: the file is served from the opened folder so relative CSS/JS/images resolve. */
export function HtmlPane({ path }: DocProps) {
  const doc = useDocuments((s) => s.docs[path]);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    previewUrl(path)
      .then((u) => alive && setUrl(u))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    // Any save in the workspace may be this page's CSS or script, so reload on all of them.
    const off = events.on('file:saved', () => setReloadKey((k) => k + 1));
    return () => {
      alive = false;
      off();
    };
  }, [path]);

  // Unsaved edits are handed to the preview server so the frame shows what the editor shows.
  // Only this page is overridden; a dirty stylesheet or script still shows its saved version.
  const dirty = !!doc && doc.status === 'ready' && doc.text !== doc.savedText;
  const text = doc?.text;
  const firstRun = useRef(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      previewBuffer(path, dirty && text !== undefined ? text : null)
        .then(() => {
          // A clean page on first mount already shows the saved file; anything else needs a reload.
          if (!firstRun.current || dirty) setReloadKey((k) => k + 1);
          firstRun.current = false;
        })
        .catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [path, dirty, text]);
  useEffect(
    () => () => {
      void previewBuffer(path, null).catch(() => undefined);
    },
    [path],
  );

  // Loading and error states (binary, too large) are the generic editor's job.
  if (!doc || doc.status !== 'ready') return <EditorPane path={path} />;

  return (
    <SourcePreview
      label="HTML view"
      source={<CodeEditor path={path} initialText={doc.text} />}
      actions={<WebActions url={url} onReload={() => setReloadKey((k) => k + 1)} />}
      preview={
        url ? (
          <WebFrame url={url} reloadKey={reloadKey} title="HTML preview" />
        ) : (
          <div className={styles.note}>{error ?? 'Starting preview…'}</div>
        )
      }
    />
  );
}

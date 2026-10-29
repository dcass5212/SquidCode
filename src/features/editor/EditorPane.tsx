import { useDocuments } from '../../core/stores/documents';
import type { DocProps } from '../types';
import { CodeEditor } from './CodeEditor';
import styles from './EditorPane.module.css';

const reasons: Record<string, string> = {
  binary: "This file isn't UTF-8 text, so it can't be edited here.",
  too_large: 'This file is too large to open.',
};

/** Generic text handler: loading and error states, otherwise the CodeMirror editor. */
export function EditorPane({ path }: DocProps) {
  const doc = useDocuments((s) => s.docs[path]);

  if (!doc || doc.status === 'loading') return <div className={styles.note}>Loading…</div>;

  if (doc.status === 'error') {
    return (
      <div className={styles.note}>
        <strong>{reasons[doc.errorKind ?? ''] ?? "Couldn't open this file."}</strong>
        <span>{doc.error}</span>
      </div>
    );
  }

  return <CodeEditor path={path} initialText={doc.text} />;
}

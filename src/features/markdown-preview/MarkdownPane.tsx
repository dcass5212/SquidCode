import { lazy, Suspense, useRef } from 'react';
import { useDocuments } from '../../core/stores/documents';
import { useSourcePreview } from '../../core/stores/sourcePreview';
import { SourcePreview } from '../../ui/SourcePreview';
import { CodeEditor } from '../editor/CodeEditor';
import { EditorPane } from '../editor/EditorPane';
import type { DocProps } from '../types';
import { useScrollSync } from './useScrollSync';

// The renderer (react-markdown, micromark, highlight.js) is a big chunk; load it on first .md open.
const MarkdownPreview = lazy(() =>
  import('./MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })),
);

/** Markdown handler: source / split / preview over the shared document. */
export function MarkdownPane({ path }: DocProps) {
  const doc = useDocuments((s) => s.docs[path]);
  const mode = useSourcePreview((s) => s.mode);
  const body = useRef<HTMLDivElement>(null);
  useScrollSync(body, mode === 'split');

  // Loading and error states (binary, too large) are the generic editor's job.
  if (!doc || doc.status !== 'ready') return <EditorPane path={path} />;

  return (
    <SourcePreview
      label="Markdown view"
      bodyRef={body}
      source={<CodeEditor path={path} initialText={doc.text} />}
      preview={
        <Suspense fallback={null}>
          <MarkdownPreview path={path} />
        </Suspense>
      }
    />
  );
}

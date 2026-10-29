import { useRef, type ReactNode, type RefObject } from 'react';
import { useSourcePreview, type ViewMode } from '../core/stores/sourcePreview';
import { Splitter } from './Splitter';
import styles from './SourcePreview.module.css';

const modes: { id: ViewMode; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'split', label: 'Split' },
  { id: 'preview', label: 'Preview' },
];

interface SourcePreviewProps {
  label: string;
  source: ReactNode;
  preview: ReactNode;
  /** Right-aligned toolbar buttons, e.g. reload. */
  actions?: ReactNode;
  /** Receives the split container so callers can attach behavior such as scroll sync. */
  bodyRef?: RefObject<HTMLDivElement | null>;
}

/** Source / split / preview chrome shared by handlers that render their file (Markdown, HTML). */
export function SourcePreview({ label, source, preview, actions, bodyRef }: SourcePreviewProps) {
  const { mode, ratio, setMode, setRatio } = useSourcePreview();
  const own = useRef<HTMLDivElement>(null);
  const body = bodyRef ?? own;

  const fromPointer = (clientX: number) => {
    const box = body.current?.getBoundingClientRect();
    return box ? (clientX - box.left) / box.width : ratio;
  };

  return (
    <div className={styles.pane}>
      <div className={styles.toolbar}>
        <div className={styles.modes} role="group" aria-label={label}>
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.mode}
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode !== 'source' && actions}
      </div>
      <div ref={body} className={styles.body}>
        {mode !== 'preview' && (
          <div
            className={styles.source}
            style={mode === 'split' ? { flex: `0 0 ${ratio * 100}%` } : undefined}
          >
            {source}
            {mode === 'split' && (
              <Splitter
                value={Math.round(ratio * 100)}
                min={20}
                max={80}
                label="Resize source and preview"
                fromPointer={fromPointer}
                onChange={(v) => setRatio(v > 1 ? v / 100 : v)}
              />
            )}
          </div>
        )}
        {mode !== 'source' && <div className={styles.preview}>{preview}</div>}
      </div>
    </div>
  );
}

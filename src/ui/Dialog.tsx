import { useEffect, useRef } from 'react';
import { useDialog } from '../core/stores/dialog';
import { Button } from './Button';
import styles from './Dialog.module.css';

/** Renders whichever question `ask()` has pending. Mounted once, in the shell. */
export function Dialog() {
  const current = useDialog((s) => s.current);
  const answer = useDialog((s) => s.answer);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;
    const previous = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    return () => previous?.focus?.();
  }, [current]);

  if (!current) return null;

  const defaultId = (current.buttons.find((b) => b.primary) ?? current.buttons[0])?.id;

  return (
    <div className={styles.backdrop} onMouseDown={() => answer(null)}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            answer(null);
          }
        }}
      >
        <h2 id="dialog-title" className={styles.title}>
          {current.title}
        </h2>
        <p className={styles.message}>{current.message}</p>
        <div className={styles.buttons}>
          {current.buttons.map((b) => (
            <Button
              key={b.id}
              ref={b.id === defaultId ? primary : undefined}
              className={b.danger ? styles.danger : undefined}
              data-primary={b.id === defaultId || undefined}
              onClick={() => answer(b.id)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

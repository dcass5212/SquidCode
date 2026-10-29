import { useEffect, useRef, useState } from 'react';
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  useSettings,
  type ThemeSetting,
} from '../../core/stores/settings';
import { Button } from '../../ui/Button';
import styles from './Settings.module.css';

const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/** Status-bar button + popover for the few settings the app has. */
export function SettingsItem() {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={wrapper} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Settings"
      >
        Settings
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Settings">
          <div className={styles.field}>
            <span className={styles.label} id="theme-label">
              Theme
            </span>
            <div className={styles.segmented} role="radiogroup" aria-labelledby="theme-label">
              {THEMES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  className={styles.segment}
                  onClick={() => setTheme(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Editor font size</span>
            <div className={styles.stepper}>
              <Button
                type="button"
                aria-label="Smaller"
                disabled={fontSize <= FONT_SIZE_MIN}
                onClick={() => setFontSize(fontSize - 1)}
              >
                −
              </Button>
              <output className={styles.value}>{fontSize}px</output>
              <Button
                type="button"
                aria-label="Larger"
                disabled={fontSize >= FONT_SIZE_MAX}
                onClick={() => setFontSize(fontSize + 1)}
              >
                +
              </Button>
            </div>
          </div>
          <p className={styles.hint}>Ctrl+= and Ctrl+- change the size, Ctrl+0 resets it.</p>
        </div>
      )}
    </div>
  );
}

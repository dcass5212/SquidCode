import { openUrl } from '@tauri-apps/plugin-opener';
import { Icon } from '../../ui/Icon';
import styles from './WebFrame.module.css';

interface WebActionsProps {
  url: string | null;
  onReload: () => void;
}

/** Reload + open-in-system-browser, shared by the HTML preview and the Web tab. */
export function WebActions({ url, onReload }: WebActionsProps) {
  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onReload}
        disabled={!url}
        title="Reload"
        aria-label="Reload"
      >
        <Icon name="rotate-cw" size={14} />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => url && void openUrl(url).catch(() => {})}
        disabled={!url}
        title="Open in browser"
        aria-label="Open in browser"
      >
        <Icon name="external-link" size={14} />
      </button>
    </>
  );
}

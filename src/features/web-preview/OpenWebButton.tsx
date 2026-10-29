import { Icon } from '../../ui/Icon';
import { openWebTab } from './store';
import styles from './WebFrame.module.css';

/** Status-bar entry point; the same action as the `web.open` command. */
export function OpenWebButton() {
  return (
    <button
      type="button"
      className={styles.statusButton}
      onClick={() => openWebTab()}
      title="Preview a local dev server (Ctrl+Shift+L)"
    >
      <Icon name="globe" size={12} /> Web preview
    </button>
  );
}

import { isDirty, useDocuments } from '../../core/stores/documents';
import { Icon } from '../../ui/Icon';
import { saveActive } from './saveActive';
import styles from './SaveButton.module.css';

/** Enabled only when the active document has unsaved changes. The store reports save failures itself. */
export function SaveButton() {
  const canSave = useDocuments((s) => isDirty(s.activePath ? s.docs[s.activePath] : undefined));
  return (
    <button
      className={styles.button}
      onClick={saveActive}
      disabled={!canSave}
      title="Save (Ctrl+S)"
      aria-label="Save"
    >
      <Icon name="save" />
    </button>
  );
}

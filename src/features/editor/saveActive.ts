import { useDocuments } from '../../core/stores/documents';

/** Shared by the `file.save` command and the toolbar button so they cannot drift apart. */
export function saveActive() {
  const { activePath, save } = useDocuments.getState();
  if (activePath) void save(activePath);
}

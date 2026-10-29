import { createElement } from 'react';
import { useDocuments } from '../core/stores/documents';
import { registry } from '../features/registry';

/** Shows the active tab through whichever feature claims its file type. */
export function DocumentArea() {
  const path = useDocuments((s) => s.activePath);
  const handler = path ? registry.resolveFileHandler(path) : null;
  // Handlers are long-lived registry components, not created per render. The key remounts
  // on tab switch so no editor state leaks between files.
  return path && handler ? createElement(handler, { key: path, path }) : null;
}

/** Matches a keydown against a spec like "Ctrl+S" or "Ctrl+Shift+Tab" (Ctrl also matches Cmd). */
export function matchesKeybinding(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  spec: string,
): boolean {
  const parts = spec.toLowerCase().split('+');
  const key = parts.pop();
  return (
    e.key.toLowerCase() === key &&
    (e.ctrlKey || e.metaKey) === parts.includes('ctrl') &&
    e.shiftKey === parts.includes('shift') &&
    e.altKey === parts.includes('alt')
  );
}

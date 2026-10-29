const key = (root: string) => `squidcode.webTabs:${root}`;

/** Tolerates anything in storage: hand-edited, from an older version, or not JSON at all. */
export function parseSaved(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

export function loadSaved(root: string): string[] {
  try {
    return parseSaved(localStorage.getItem(key(root)));
  } catch {
    return [];
  }
}

export function saveSaved(root: string, urls: string[]) {
  try {
    if (urls.length === 0) localStorage.removeItem(key(root));
    else localStorage.setItem(key(root), JSON.stringify(urls));
  } catch {
    // Storage unavailable: tabs just won't come back, which is not worth an error.
  }
}

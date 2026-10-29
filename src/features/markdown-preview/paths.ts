/** Hrefs with a scheme (http:, mailto:, data:) or protocol-relative `//` are not workspace files. */
export const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);

/**
 * Resolves a relative Markdown href/src against the document's path. Returns null for
 * external URLs, pure `#anchor` links, and anything that climbs above the drive/root.
 * Keeps the document's own separator so the result matches paths the tree hands out.
 */
export function resolveRelative(docPath: string, href: string): string | null {
  if (!href || isExternal(href) || href.startsWith('#')) return null;
  const sep = docPath.includes('\\') ? '\\' : '/';
  const target = href.replace(/[?#].*$/, '');
  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return null;
  }
  // A leading slash means "from the workspace root"; we don't know it here, so don't guess.
  if (decoded.startsWith('/')) return null;
  const parts = docPath.split(/[\\/]/);
  parts.pop(); // the document's own file name
  for (const seg of decoded.split(/[\\/]/)) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length <= 1) return null;
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.join(sep);
}

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
};

/** MIME type for an image path, or null if it isn't a previewable image. */
export function imageType(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_TYPES[ext] ?? null;
}

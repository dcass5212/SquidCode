export interface WebTarget {
  url: string;
  /** Only localhost / 127.0.0.1 may be framed (the CSP allows nothing else). */
  local: boolean;
}

/** Turns what the user typed ("localhost:5173", "http://127.0.0.1:3000/app") into a URL. */
export function parseWebTarget(input: string): WebTarget | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return { url: url.href, local: url.hostname === 'localhost' || url.hostname === '127.0.0.1' };
}

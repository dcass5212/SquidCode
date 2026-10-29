/** GitHub-style heading slug: lowercase, punctuation dropped, spaces to hyphens. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** Slugs for a document's headings in order; repeats get `-1`, `-2`, ... like GitHub. */
export function headingSlugs(texts: string[]): string[] {
  const seen = new Map<string, number>();
  return texts.map((text) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  });
}

/** The heading a `#fragment` points at, or null. */
export function findHeading(article: Element, fragment: string): Element | null {
  let wanted: string;
  try {
    wanted = decodeURIComponent(fragment.replace(/^#/, '')).toLowerCase();
  } catch {
    return null;
  }
  const headings = [...article.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const slugs = headingSlugs(headings.map((h) => h.textContent ?? ''));
  return headings[slugs.indexOf(wanted)] ?? null;
}

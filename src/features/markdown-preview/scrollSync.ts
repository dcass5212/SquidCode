import type { Element, Root } from 'hast';

/** A rendered block and the source line it starts on. `top` is in the scroller's content space. */
export interface Anchor {
  line: number;
  top: number;
}

/**
 * Rehype plugin: stamps block elements with the source line they came from, so the preview can
 * be lined up with the editor by content instead of by scroll percentage (which drifts as soon
 * as there are images, tables or code blocks).
 */
export function rehypeSourceLines() {
  const blocks = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li']);
  for (const tag of ['pre', 'blockquote', 'table', 'hr']) blocks.add(tag);
  const walk = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      const line = child.position?.start.line;
      if (line && blocks.has(child.tagName)) child.properties.dataLine = line;
      walk(child);
    }
  };
  return (tree: Root) => walk(tree);
}

/** Piecewise-linear map between two monotonic scales: `from` values to `to` values. */
function interpolate(points: [number, number][], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  let i = 1;
  while ((points[i] as [number, number])[0] < x) i++;
  const [x0, y0] = points[i - 1] as [number, number];
  const [x1, y1] = points[i] as [number, number];
  return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** Keeps the first anchor per line and drops any that would make `top` run backwards. */
function monotonic(anchors: Anchor[]): Anchor[] {
  const out: Anchor[] = [];
  for (const a of [...anchors].sort((p, q) => p.line - q.line || p.top - q.top)) {
    const prev = out[out.length - 1];
    if (!prev || (a.line > prev.line && a.top >= prev.top)) out.push(a);
  }
  return out;
}

/** Preview scrollTop that shows the same place as (fractional) source line `line`. */
export function topForLine(anchors: Anchor[], line: number): number {
  return interpolate(
    monotonic(anchors).map((a) => [a.line, a.top]),
    line,
  );
}

/** Inverse of `topForLine`. */
export function lineForTop(anchors: Anchor[], top: number): number {
  return interpolate(
    monotonic(anchors).map((a) => [a.top, a.line]),
    top,
  );
}

/** Reads the stamped blocks out of the rendered preview. */
export function readAnchors(scroller: HTMLElement): Anchor[] {
  const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
  return Array.from(scroller.querySelectorAll<HTMLElement>('[data-line]')).map((el) => ({
    line: Number(el.dataset.line),
    top: el.getBoundingClientRect().top - base,
  }));
}

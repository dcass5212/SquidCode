import { EditorView } from '@codemirror/view';
import { useEffect, type RefObject } from 'react';
import { lineForTop, readAnchors, topForLine } from './scrollSync';

const EDGE = 2; // px of slack when deciding a pane is at its top/bottom

const atTop = (el: HTMLElement) => el.scrollTop <= EDGE;
const atBottom = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE;

/** Fractional 1-based line at the top of the editor viewport. */
function editorTopLine(view: EditorView): number {
  const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
  const line = view.state.doc.lineAt(block.from).number;
  return line + (view.scrollDOM.scrollTop - block.top) / Math.max(block.height, 1);
}

function scrollEditorToLine(view: EditorView, line: number) {
  const doc = view.state.doc;
  const whole = Math.min(Math.max(Math.floor(line), 1), doc.lines);
  const block = view.lineBlockAt(doc.line(whole).from);
  view.scrollDOM.scrollTop = block.top + (line - whole) * block.height;
}

/**
 * Keeps the editor and preview in `body` showing the same place. Listens in the capture phase
 * on the container (scroll doesn't bubble) so it works whichever pane mounts first — the
 * preview is lazy-loaded.
 */
export function useScrollSync(body: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = body.current;
    if (!root || !enabled) return;
    // The pane we just moved ourselves; its echo scroll event must not bounce back.
    let echo: { el: Element; top: number } | null = null;

    const move = (el: HTMLElement, top: number) => {
      if (Math.abs(el.scrollTop - top) < 1) return;
      echo = { el, top };
      el.scrollTop = top;
      echo.top = el.scrollTop; // the browser clamps to the scrollable range
    };

    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (echo?.el === target) {
        const ours = Math.abs(target.scrollTop - echo.top) < 2;
        echo = null;
        if (ours) return;
      }
      const preview = root.querySelector<HTMLElement>('[data-preview-scroll]');
      const dom = root.querySelector<HTMLElement>('.cm-editor');
      const view = dom ? EditorView.findFromDOM(dom) : null;
      if (!preview || !view) return;

      if (target === view.scrollDOM) {
        if (atTop(target)) move(preview, 0);
        else if (atBottom(target)) move(preview, preview.scrollHeight);
        else move(preview, topForLine(readAnchors(preview), editorTopLine(view)));
      } else if (target === preview) {
        if (atTop(target)) move(view.scrollDOM, 0);
        else if (atBottom(target)) move(view.scrollDOM, view.scrollDOM.scrollHeight);
        else scrollEditorToLine(view, lineForTop(readAnchors(preview), target.scrollTop));
      }
    };

    root.addEventListener('scroll', onScroll, true);
    return () => root.removeEventListener('scroll', onScroll, true);
  }, [body, enabled]);
}

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput, LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { events } from '../../core/events';
import { useDocuments } from '../../core/stores/documents';
import styles from './CodeEditor.module.css';
import { editorTheme, highlighting } from './theme';

/**
 * Per-tab editor state (doc, undo history, selection) survives tab switches: the view is
 * rebuilt on mount but restored from here, and dropped when the tab closes.
 */
const savedStates = new Map<string, EditorState>();
events.on('doc:closed', ({ path }) => savedStates.delete(path));

const language = new Compartment();

function createState(path: string, text: string, onChange: (text: string) => void) {
  return EditorState.create({
    doc: text,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.lineWrapping,
      editorTheme,
      highlighting,
      language.of([]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChange(u.state.doc.toString());
      }),
      EditorView.contentAttributes.of({ 'aria-label': path.split(/[\\/]/).pop() ?? path }),
    ],
  });
}

export function CodeEditor({ path, initialText }: { path: string; initialText: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const setText = (text: string) => useDocuments.getState().setText(path, text);
    const view = new EditorView({
      state: savedStates.get(path) ?? createState(path, initialText, setText),
      parent: host.current,
    });
    view.focus();

    // The store's text can change under the editor (reload after an external edit), and a
    // cached state from a hidden tab may be stale; both are replaced wholesale.
    const syncFromStore = () => {
      const text = useDocuments.getState().docs[path]?.text;
      if (text === undefined || text === view.state.doc.toString()) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    };
    syncFromStore();
    const unsubscribe = useDocuments.subscribe(syncFromStore);

    // Language packs are separate chunks, fetched only when a matching file is opened.
    const description = LanguageDescription.matchFilename(
      languages,
      path.split(/[\\/]/).pop() ?? path,
    );
    let alive = true;
    void description?.load().then((support) => {
      if (alive) view.dispatch({ effects: language.reconfigure(support) });
    });

    return () => {
      alive = false;
      unsubscribe();
      savedStates.set(path, view.state);
      view.destroy();
    };
    // initialText only seeds a fresh state; later edits flow through the editor, not props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return <div ref={host} className={styles.host} />;
}

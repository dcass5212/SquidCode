import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/** Colors come from tokens.css so the editor follows light/dark with the rest of the app. */
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text)',
    backgroundColor: 'var(--bg)',
    fontSize: 'var(--editor-font-size)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { padding: 'var(--space-2) 0', caretColor: 'var(--accent)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-muted)',
    border: 'none',
  },
  '.cm-activeLine': { backgroundColor: 'var(--bg-subtle)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--bg-subtle)', color: 'var(--text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection)',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)' },
  '.cm-searchMatch': { backgroundColor: 'var(--accent-soft)' },
  '.cm-panels': {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text)',
    borderColor: 'var(--border)',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
});

const highlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier],
    color: 'var(--syntax-keyword)',
  },
  { tag: [t.string, t.regexp, t.special(t.string)], color: 'var(--syntax-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syntax-number)' },
  { tag: [t.comment, t.meta], color: 'var(--syntax-comment)', fontStyle: 'italic' },
  {
    tag: [t.function(t.variableName), t.propertyName, t.definition(t.variableName)],
    color: 'var(--syntax-function)',
  },
  { tag: [t.typeName, t.className, t.tagName, t.namespace], color: 'var(--syntax-type)' },
  { tag: t.heading, color: 'var(--syntax-function)', fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--accent)', textDecoration: 'underline' },
  { tag: t.invalid, color: 'var(--danger)' },
]);

export const highlighting = syntaxHighlighting(highlightStyle);

/**
 * The editor always works on LF text; the file's original line ending is remembered and
 * restored on save so opening and saving never rewrites a CRLF file as LF (or vice versa).
 */
export type Eol = 'lf' | 'crlf';

/** The first line break decides; mixed files are normalized to that style on save. */
export function detectEol(text: string): Eol {
  const i = text.indexOf('\n');
  return i > 0 && text[i - 1] === '\r' ? 'crlf' : 'lf';
}

export const toEditorText = (text: string): string => text.replace(/\r\n/g, '\n');

export const toDiskText = (text: string, eol: Eol): string =>
  eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text;

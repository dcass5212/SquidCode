import { describe, expect, it } from 'vitest';
import { detectEol, toDiskText, toEditorText } from './lineEndings';

describe('line endings', () => {
  it('detects CRLF from the first line break', () => {
    expect(detectEol('a\r\nb\n')).toBe('crlf');
    expect(detectEol('a\nb\r\n')).toBe('lf');
    expect(detectEol('no breaks')).toBe('lf');
  });

  it('round-trips CRLF text and keeps the trailing newline', () => {
    const disk = 'one\r\ntwo\r\n';
    expect(toDiskText(toEditorText(disk), detectEol(disk))).toBe(disk);
  });

  it('leaves LF text untouched', () => {
    expect(toDiskText('a\nb', 'lf')).toBe('a\nb');
  });
});

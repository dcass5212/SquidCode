import { describe, expect, it } from 'vitest';
import { imageType, isExternal, resolveRelative } from './paths';

describe('resolveRelative', () => {
  const doc = 'C:\\proj\\docs\\README.md';
  it('resolves siblings and subfolders', () => {
    expect(resolveRelative(doc, 'img/a.png')).toBe('C:\\proj\\docs\\img\\a.png');
    expect(resolveRelative(doc, './b.md')).toBe('C:\\proj\\docs\\b.md');
  });
  it('resolves parent segments and decodes escapes', () => {
    expect(resolveRelative(doc, '../src/my%20file.ts')).toBe('C:\\proj\\src\\my file.ts');
  });
  it('drops query and fragment', () => {
    expect(resolveRelative(doc, 'b.md#intro')).toBe('C:\\proj\\docs\\b.md');
  });
  it('rejects external, anchor, rooted and escaping hrefs', () => {
    expect(resolveRelative(doc, 'https://x.dev')).toBeNull();
    expect(resolveRelative(doc, '#top')).toBeNull();
    expect(resolveRelative(doc, '/abs.md')).toBeNull();
    expect(resolveRelative(doc, '../../../../x.md')).toBeNull();
  });
  it('keeps posix separators', () => {
    expect(resolveRelative('/home/a/README.md', 'b/c.md')).toBe('/home/a/b/c.md');
  });
});

describe('isExternal / imageType', () => {
  it('detects schemes', () => {
    expect(isExternal('mailto:a@b.c')).toBe(true);
    expect(isExternal('//cdn.x/a.png')).toBe(true);
    expect(isExternal('a/b.png')).toBe(false);
  });
  it('maps image extensions', () => {
    expect(imageType('x/A.PNG')).toBe('image/png');
    expect(imageType('x/a.txt')).toBeNull();
  });
});

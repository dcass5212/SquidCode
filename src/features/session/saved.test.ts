import { describe, expect, it } from 'vitest';
import { parseSession } from './saved';

describe('parseSession', () => {
  it('keeps valid fields', () => {
    expect(parseSession({ files: ['a', 'b'], active: 'b' })).toEqual({
      files: ['a', 'b'],
      active: 'b',
    });
  });

  it('survives junk', () => {
    expect(parseSession(null)).toEqual({ files: [], active: null });
    expect(parseSession({ files: 'x', active: 3 })).toEqual({ files: [], active: null });
    expect(parseSession({ files: ['a', 1, null] }).files).toEqual(['a']);
  });
});

import { describe, expect, it } from 'vitest';
import { parseSaved } from './saved';

describe('parseSaved', () => {
  it('reads a list of urls', () => {
    expect(parseSaved('["http://localhost:3000/","http://127.0.0.1:8000/"]')).toEqual([
      'http://localhost:3000/',
      'http://127.0.0.1:8000/',
    ]);
  });

  it('drops non-strings and survives bad input', () => {
    expect(parseSaved('["a",1,null]')).toEqual(['a']);
    expect(parseSaved('{"a":1}')).toEqual([]);
    expect(parseSaved('not json')).toEqual([]);
    expect(parseSaved(null)).toEqual([]);
  });
});

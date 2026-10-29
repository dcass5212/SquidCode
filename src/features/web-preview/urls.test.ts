import { describe, expect, it } from 'vitest';
import { parseWebTarget } from './urls';

describe('parseWebTarget', () => {
  it('adds http:// to bare hosts', () => {
    expect(parseWebTarget('localhost:5173')).toEqual({
      url: 'http://localhost:5173/',
      local: true,
    });
  });
  it('keeps paths and recognizes 127.0.0.1', () => {
    expect(parseWebTarget(' http://127.0.0.1:3000/app ')).toEqual({
      url: 'http://127.0.0.1:3000/app',
      local: true,
    });
  });
  it('flags remote hosts as not local', () => {
    expect(parseWebTarget('https://example.com')?.local).toBe(false);
    expect(parseWebTarget('localhost.evil.com')?.local).toBe(false);
  });
  it('rejects empty input and other schemes', () => {
    expect(parseWebTarget('')).toBeNull();
    expect(parseWebTarget('file:///c:/x')).toBeNull();
    expect(parseWebTarget('javascript:alert(1)')).toBeNull();
  });
});

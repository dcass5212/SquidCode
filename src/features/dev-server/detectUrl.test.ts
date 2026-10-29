import { describe, expect, it } from 'vitest';
import { findLocalUrl, stripAnsi } from './detectUrl';

describe('findLocalUrl', () => {
  it('reads uvicorn output', () => {
    expect(
      findLocalUrl('INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)'),
    ).toBe('http://127.0.0.1:8000');
  });
  it('reads colored vite output', () => {
    expect(
      findLocalUrl(
        '  \u001b[32m➜\u001b[39m  Local:   \u001b[36mhttp://localhost:\u001b[1m5173\u001b[22m/\u001b[39m',
      ),
    ).toBe('http://localhost:5173/');
  });
  it('maps wildcard binds to localhost', () => {
    expect(findLocalUrl('listening on http://0.0.0.0:3000')).toBe('http://localhost:3000');
  });
  it('ignores remote and portless urls', () => {
    expect(findLocalUrl('see https://example.com:443/docs')).toBeNull();
    expect(findLocalUrl('http://localhost/')).toBeNull();
  });
  it('strips ANSI codes', () => {
    expect(stripAnsi('\u001b[1mhi\u001b[0m')).toBe('hi');
  });
});

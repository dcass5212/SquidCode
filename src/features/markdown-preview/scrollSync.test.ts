import { describe, expect, it } from 'vitest';
import { lineForTop, topForLine, type Anchor } from './scrollSync';

// Line 1 at 0px, a tall image block at line 5 (so lines 5-9 take 400px), then text.
const anchors: Anchor[] = [
  { line: 1, top: 0 },
  { line: 5, top: 40 },
  { line: 10, top: 440 },
];

describe('scroll sync mapping', () => {
  it('interpolates inside a block', () => {
    expect(topForLine(anchors, 3)).toBe(20);
    expect(topForLine(anchors, 7.5)).toBe(240);
  });
  it('clamps outside the anchors', () => {
    expect(topForLine(anchors, 0)).toBe(0);
    expect(topForLine(anchors, 99)).toBe(440);
  });
  it('round-trips', () => {
    expect(lineForTop(anchors, topForLine(anchors, 8.25))).toBeCloseTo(8.25);
  });
  it('ignores nested anchors that would run backwards', () => {
    const nested = [...anchors, { line: 6, top: 10 }];
    expect(topForLine(nested, 7.5)).toBe(240);
  });
  it('handles no anchors', () => {
    expect(topForLine([], 3)).toBe(0);
  });
});

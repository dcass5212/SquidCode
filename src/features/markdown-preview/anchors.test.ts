import { describe, expect, it } from 'vitest';
import { headingSlugs, slugify } from './anchors';

describe('slugify', () => {
  it('matches GitHub for common headings', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
    expect(slugify('What’s new? (v2.0)')).toBe('whats-new-v20');
    expect(slugify('Café au lait')).toBe('café-au-lait');
  });
});

describe('headingSlugs', () => {
  it('numbers repeated headings', () => {
    expect(headingSlugs(['Usage', 'Usage', 'Other', 'Usage'])).toEqual([
      'usage',
      'usage-1',
      'other',
      'usage-2',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { tabLabels } from './labels';

describe('tabLabels', () => {
  it('uses plain file names when they are unique', () => {
    expect(tabLabels(['C:\\p\\a.ts', 'C:\\p\\b.ts'])).toEqual({
      'C:\\p\\a.ts': 'a.ts',
      'C:\\p\\b.ts': 'b.ts',
    });
  });

  it('adds the parent folder to colliding names', () => {
    const labels = tabLabels(['C:\\p\\x\\index.ts', 'C:\\p\\y\\index.ts']);
    expect(labels['C:\\p\\x\\index.ts']).toBe('index.ts — x');
    expect(labels['C:\\p\\y\\index.ts']).toBe('index.ts — y');
  });

  it('labels virtual web tabs without treating them as files', () => {
    expect(tabLabels(['web:1'])).toEqual({ 'web:1': 'Web' });
    expect(tabLabels(['web:1', 'web:3'])).toEqual({ 'web:1': 'Web 1', 'web:3': 'Web 3' });
  });
});

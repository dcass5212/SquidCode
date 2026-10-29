import { describe, expect, it } from 'vitest';
import { MAX_RATIO, MIN_RATIO, useSourcePreview } from './sourcePreview';

describe('useSourcePreview', () => {
  it('clamps the split ratio', () => {
    useSourcePreview.getState().setRatio(0.01);
    expect(useSourcePreview.getState().ratio).toBe(MIN_RATIO);
    useSourcePreview.getState().setRatio(2);
    expect(useSourcePreview.getState().ratio).toBe(MAX_RATIO);
  });
});

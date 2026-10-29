import { describe, expect, it } from 'vitest';
import { mtimeDiffers } from './changes';

describe('mtimeDiffers', () => {
  it('ignores sub-millisecond noise', () => {
    expect(mtimeDiffers(1000, 1000.4)).toBe(false);
    expect(mtimeDiffers(1000, 1002)).toBe(true);
  });
});

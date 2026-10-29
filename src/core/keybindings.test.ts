import { describe, expect, it } from 'vitest';
import { matchesKeybinding } from './keybindings';

const press = (key: string, mods: Partial<KeyboardEvent> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('matchesKeybinding', () => {
  it('matches Ctrl+S regardless of key case', () => {
    expect(matchesKeybinding(press('s', { ctrlKey: true }), 'Ctrl+S')).toBe(true);
    expect(matchesKeybinding(press('S', { ctrlKey: true }), 'Ctrl+S')).toBe(true);
  });

  it('requires the exact modifier set', () => {
    expect(matchesKeybinding(press('s'), 'Ctrl+S')).toBe(false);
    expect(matchesKeybinding(press('s', { ctrlKey: true, shiftKey: true }), 'Ctrl+S')).toBe(false);
    expect(matchesKeybinding(press('s', { ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+S')).toBe(
      true,
    );
  });
});

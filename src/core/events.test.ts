import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from './events';

describe('event bus', () => {
  it('delivers payloads to subscribers until unsubscribed', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const off = bus.on('file:saved', handler);

    bus.emit('file:saved', { path: 'a.md' });
    off();
    bus.emit('file:saved', { path: 'b.md' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ path: 'a.md' });
  });
});

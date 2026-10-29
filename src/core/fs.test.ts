import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const { FsError, readDir, writeFile } = await import('./fs');

beforeEach(() => {
  invoke.mockReset(); // braces: a returned function would be run by vitest as teardown
});

describe('fs wrapper', () => {
  it('passes arguments to the matching Rust command', async () => {
    invoke.mockResolvedValue([]);
    await readDir('C:/proj');
    expect(invoke).toHaveBeenCalledWith('read_dir', { path: 'C:/proj' });
  });

  it('always sends expectedMtimeMs so Rust sees None rather than a missing arg', async () => {
    invoke.mockResolvedValue(1);
    await writeFile('C:/proj/a.md', 'hi');
    expect(invoke).toHaveBeenCalledWith('write_file', {
      path: 'C:/proj/a.md',
      text: 'hi',
      expectedMtimeMs: null,
    });
  });

  it('turns Rust errors into typed FsError', async () => {
    invoke.mockImplementation(() =>
      Promise.reject({ kind: 'conflict', message: 'changed on disk' }),
    );
    const err = await writeFile('a', 'b', 1).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FsError);
    // Field-by-field: toMatchObject has special equality rules for Error instances.
    expect((err as InstanceType<typeof FsError>).kind).toBe('conflict');
    expect((err as Error).message).toBe('changed on disk');
  });
});

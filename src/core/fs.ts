/**
 * The only module that calls `invoke` for filesystem work. Mirrors the commands in
 * src-tauri/src/fs.rs. All paths must lie inside a folder the user opened via `pickFolder`;
 * Rust enforces that, not this wrapper.
 */
import { invoke } from '@tauri-apps/api/core';

export type EntryKind = 'file' | 'dir' | 'symlink';

export interface Entry {
  name: string;
  kind: EntryKind;
  size: number;
  mtimeMs: number;
}

export interface FileContent {
  text: string;
  mtimeMs: number;
  encoding: string;
}

export interface Stat {
  kind: EntryKind;
  size: number;
  mtimeMs: number;
}

export type FsErrorKind =
  | 'not_implemented'
  | 'not_found'
  | 'outside_scope'
  | 'binary'
  | 'too_large'
  | 'conflict' // disk mtime differs from the one we last read
  | 'io';

export class FsError extends Error {
  constructor(
    readonly kind: FsErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'FsError';
  }
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'kind' in e && 'message' in e) {
      const { kind, message } = e as { kind: FsErrorKind; message: string };
      throw new FsError(kind, message);
    }
    throw new FsError('io', String(e));
  }
}

/** Shows the native folder dialog and grants access to the chosen folder. Null if cancelled. */
export const pickFolder = () => call<string | null>('pick_folder');

/** One directory level, unsorted. */
export const readDir = (path: string) => call<Entry[]>('read_dir', { path });

export const readFile = (path: string) => call<FileContent>('read_file', { path });

/** Raw bytes (for images in the Markdown preview). */
export const readFileBytes = async (path: string): Promise<Uint8Array> =>
  new Uint8Array(await call<ArrayBuffer>('read_file_bytes', { path }));

/** Atomic write. Rejects with kind 'conflict' if the disk mtime differs from `expectedMtimeMs`. */
export const writeFile = (path: string, text: string, expectedMtimeMs?: number) =>
  call<number>('write_file', { path, text, expectedMtimeMs: expectedMtimeMs ?? null });

export const stat = (path: string) => call<Stat>('stat', { path });

/** http://127.0.0.1 URL that serves a workspace file with its relative assets (HTML preview). */
export const previewUrl = (path: string) => call<string>('preview_url', { path });

/** Re-opens the folder picked last time (Rust remembers it). Null if none or it is gone. */
export const restoreFolder = () => call<string | null>('restore_folder');

/** Serves unsaved editor text for an HTML file in the preview; null goes back to the disk copy. */
export const previewBuffer = (path: string, text: string | null) =>
  call<void>('preview_buffer', { path, text });

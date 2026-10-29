import { asObject, readStored } from '../../core/persist';

export interface SavedSession {
  /** File tabs in order (Web tabs restore through their own store). */
  files: string[];
  active: string | null;
}

export const sessionKey = (root: string) => `squidcode.session:${root}`;

/** Tolerates anything in storage, like the Web tab list does. */
export function parseSession(value: unknown): SavedSession {
  const v = asObject(value);
  const files = Array.isArray(v.files)
    ? v.files.filter((p): p is string => typeof p === 'string')
    : [];
  return { files, active: typeof v.active === 'string' ? v.active : null };
}

export const loadSession = (root: string): SavedSession =>
  readStored(sessionKey(root), parseSession, { files: [], active: null });

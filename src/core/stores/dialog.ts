import { create } from 'zustand';

export interface DialogButton {
  id: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
}

export interface DialogRequest {
  title: string;
  message: string;
  buttons: DialogButton[];
}

interface DialogState {
  current: (DialogRequest & { resolve: (id: string | null) => void }) | null;
  /** Resolves with the chosen button id, or null if dismissed (Escape). */
  ask: (request: DialogRequest) => Promise<string | null>;
  answer: (id: string | null) => void;
}

/** Promise-based modal so stores can ask the user a question without touching React. */
export const useDialog = create<DialogState>((set, get) => ({
  current: null,
  ask: (request) =>
    new Promise((resolve) => {
      // A second question while one is open cancels the first rather than stacking.
      get().current?.resolve(null);
      set({ current: { ...request, resolve } });
    }),
  answer: (id) => {
    get().current?.resolve(id);
    set({ current: null });
  },
}));

export const ask = (request: DialogRequest) => useDialog.getState().ask(request);

export const tell = (title: string, message: string) =>
  ask({ title, message, buttons: [{ id: 'ok', label: 'OK', primary: true }] });

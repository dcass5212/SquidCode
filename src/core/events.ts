/** Tiny typed event bus so features can react to core events without importing each other. */
export interface AppEvents {
  'file:saved': { path: string };
  'doc:opened': { path: string };
  'doc:closed': { path: string };
  /** Fires before the old folder's tabs are closed, so per-folder state can stop saving. */
  'workspace:closing': { root: string | null };
  'workspace:changed': { root: string | null };
}

type Handler<K extends keyof AppEvents> = (payload: AppEvents[K]) => void;

export function createEventBus() {
  const handlers = new Map<keyof AppEvents, Set<Handler<keyof AppEvents>>>();

  return {
    on<K extends keyof AppEvents>(event: K, handler: Handler<K>): () => void {
      const set = handlers.get(event) ?? new Set();
      set.add(handler as Handler<keyof AppEvents>);
      handlers.set(event, set);
      return () => set.delete(handler as Handler<keyof AppEvents>);
    },
    emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
      handlers.get(event)?.forEach((h) => h(payload));
    },
  };
}

export const events = createEventBus();

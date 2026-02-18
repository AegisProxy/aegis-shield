export type StorageLocal = {
  get: (keys: string[]) => Promise<Record<string, unknown>>;
  set: (obj: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
};

export function getStorageLocal(): StorageLocal | null {
  try {
    // Use global chrome directly - extension API is on window/globalThis
    const c =
      (typeof globalThis !== 'undefined' && (globalThis as unknown as { chrome?: unknown }).chrome) ||
      (typeof window !== 'undefined' && (window as unknown as { chrome?: unknown }).chrome) ||
      (typeof self !== 'undefined' && (self as unknown as { chrome?: unknown }).chrome);
    const local = c && (c as { storage?: { local?: StorageLocal } }).storage?.local;
    if (!local || typeof local.get !== 'function') return null;
    return local;
  } catch {
    return null;
  }
}

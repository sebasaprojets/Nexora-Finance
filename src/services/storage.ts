/**
 * Camada de persistência local (modo sem backend).
 * Todas as leituras/escritas passam por aqui para que a troca por uma API
 * (Supabase/REST) seja feita em um único ponto.
 */

const PREFIX = 'nexora:';

export function readJSON<T>(key: string, fallback: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Quota excedida ou storage bloqueado (modo privado).
    return false;
  }
}

export function removeKey(key: string, storage: Storage = localStorage) {
  try {
    storage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function removeByPrefix(prefix: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX + prefix)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

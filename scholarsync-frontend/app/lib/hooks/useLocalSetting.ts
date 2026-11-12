'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'scholarsync:setting';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** A per-browser preference in localStorage, shared live by every component that reads it. */
export function useLocalSetting<T extends string | number | boolean>(key: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (e: Event) => { if (!(e instanceof StorageEvent) || e.key === key) onChange(); };
    window.addEventListener('storage', handler);
    window.addEventListener(EVENT, handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener(EVENT, handler); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback((next: T) => {
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode: keep the in-memory default */ }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  return [value, set];
}

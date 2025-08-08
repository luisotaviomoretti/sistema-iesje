import { useEffect, useRef } from "react";

export type DraftKey = "nova-matricula";

export function useLocalDraft<T extends object>(key: DraftKey, data: T, onLoad: (loaded: Partial<T>) => void) {
  const first = useRef(true);

  // Load once
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        onLoad(parsed);
      }
    } catch (e) {
      // noop
    }
  }, [key, onLoad]);

  // Autosave on changes (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [key, data]);
}

export function clearDraft(key: DraftKey) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

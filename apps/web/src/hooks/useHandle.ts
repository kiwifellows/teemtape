import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "teemtape-handle";

function readStoredHandle(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved.trim() ? saved : null;
  } catch {
    /* private mode */
    return null;
  }
}

/**
 * Persisted anonymous handle (e.g. "user1234"). Stored in localStorage so the
 * same browser keeps the same handle across visits, with no sign-in. Returns the
 * current handle (or null) plus a setter that updates storage and other tabs.
 */
export function useHandle() {
  const [handle, setHandleState] = useState<string | null>(() => readStoredHandle());

  const setHandle = useCallback((next: string | null) => {
    setHandleState(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHandleState(readStoredHandle());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { handle, setHandle };
}
